using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Validators;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;

namespace Fiebo.Application.Services
{
    public class FieldService : IFieldService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICloudinaryService _cloudinaryService;
        public FieldService(
            IUnitOfWork unitOfWork,
            ICloudinaryService cloudinaryService
            )
        {
            _unitOfWork = unitOfWork;
            _cloudinaryService = cloudinaryService;
        }

        public async Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }
            if (venue.Status != VenueStatus.Active)
            {
                throw new BadRequestException("Cơ sở này hiện không hoạt động.");
            }
            var fields = await _unitOfWork.Fields.GetFieldsByVenue(venueId, FieldStatus.Active, page, pageSize);
            var fieldIds = fields.Items.Select(f => f.Id).ToList();

            return new PagedResult<FieldsDetailDTO>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = fields.TotalItems,
                Items = [.. fields.Items.Select(f => new FieldsDetailDTO
                {

                    Name = f.Name,
                    Description = f.Description,
                    SportType = f.SportType!.Name,
                    Images = f.Images.Select(i => i.ImageUrl).ToList()
                })]
            };
        }

        public async Task<List<SportTypeResponse>> GetAllSportTypes()
        {
            var result = await _unitOfWork.SportTypes.GetAllAsync();
            return [.. result.Select(st => new SportTypeResponse
            {
                Id = st.Id,
                Name = st.Name
            })];
        }

        public async Task<List<OwnerFieldListItemResponse>> GetOwnerFieldsByVenueAsync(int venueId, string ownerId)
        {
            // BR-49 / E1: Verify venue exists and belongs to the current Field Owner
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null || venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền truy cập vào cơ sở này.");
            }

            var fields = await _unitOfWork.Fields.GetAllFieldsByVenueAsync(venueId);

            var allTimeSlots = (await _unitOfWork.TimeSlots
                .FindAsync(ts => ts.VenueId == venueId))
                .ToList();

            var priceBySportType = allTimeSlots
                .GroupBy(ts => ts.SportTypeId)
                .ToDictionary(
                    g => g.Key,
                    g => (Min: g.Min(ts => ts.Price), Max: g.Max(ts => ts.Price))
                );

            return fields.Select(f =>
            {
                priceBySportType.TryGetValue(f.SportTypeId, out var priceRange);
                return new OwnerFieldListItemResponse
                {
                    FieldId = f.Id,
                    FieldName = f.Name,
                    SportType = f.SportType?.Name ?? "N/A",
                    Status = f.Status.ToString(),
                    MinPrice = priceRange.Min,
                    MaxPrice = priceRange.Max
                };
            }).ToList();
        }

        public async Task ChangeFieldStatusAsync(int venueId, int fieldId, string ownerId)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null || venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền thay đổi trạng thái sân trong cơ sở này.");
            }

            var field = await _unitOfWork.Fields.GetByIdAsync(fieldId);
            if (field == null || field.VenueId != venueId)
            {
                throw new NotFoundException("Không tìm thấy sân hợp lệ.");
            }

            if (field.Status == FieldStatus.Active)
            {
                field.Status = FieldStatus.Inactive;
            }
            else
            {
                field.Status = FieldStatus.Active;
            }

            field.UpdatedAt = DateTime.Now;

            _unitOfWork.Fields.Update(field);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<int> CreateFieldAsync(
            int venueId,
            CreateFieldRequest request,
            string userId)
        {
            // BR-01: Field must belong to exactly one Venue and one SportType
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở sân.");
            }

            // Authorization: Field Owner
            if (venue.OwnerId != userId)
            {
                throw new UnauthorizedException("Bạn không có quyền tạo sân trong cơ sở này.");
            }

            // BR-02 / MSG-E02: Check for duplicate field names within the same Venue
            var nameExists = await _unitOfWork.Fields
                .IsFieldNameExistsInVenueAsync(venueId, request.Name, request.SportTypeId);

            if (nameExists)
            {
                throw new ResourceConflictException(
                    "Tên sân và loại sân này đã tồn tại trong cơ sở. Vui lòng chọn một tên khác.");
            }

            // BR-03 / Default Status: Automatically set to Active
            var field = new Field
            {
                Name = request.Name,
                Description = request.Description,
                SportTypeId = request.SportTypeId,
                VenueId = venueId,
                Status = FieldStatus.Active
            };

            // MSG-E03 / Image Validation: Check if images are valid
            if (request.Images != null && request.Images.Any())
            {
                ImageValidator.ValidateFiles(request.Images, min: 0, max: 10);

                foreach (var file in request.Images)
                {
                    var uploadResult = await _cloudinaryService.UploadImageAsync(file);
                    if (uploadResult == null)
                    {
                        throw new BadRequestException("Có lỗi xảy ra khi tải lên hình ảnh lên hệ thống.");
                    }

                    field.Images.Add(new FieldImage
                    {
                        Id = uploadResult.PublicId,
                        ImageUrl = uploadResult.Url,
                        Field = field
                    });
                }
            }

            _unitOfWork.Fields.Add(field);
            await _unitOfWork.SaveChangesAsync();

            return field.Id;
        }

        public async Task UpdateFieldAsync(UpdateFieldRequest request, string? userId, int fieldId)
        {
            if (userId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện hành động này.");
            }
            var field = await _unitOfWork.Fields.GetFieldWithVenueAsync(fieldId);
            if (field == null)
            {
                throw new NotFoundException("Không tìm thấy sân.");
            }
            if (field.Venue == null || field.Venue.OwnerId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền chỉnh sửa sân này.");
            }
            field.Name = request.Name;
            field.Description = request.Description;
            field.SportTypeId = request.SportTypeId;
            _unitOfWork.Fields.Update(field);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UploadFieldImage(int fieldId, string? userId, List<IFormFile> files)
        {
            if (userId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện hành động này.");
            }
            var field = await _unitOfWork.Fields.GetFieldWithVenueAsync(fieldId);
            if (field == null)
            {
                throw new NotFoundException("Không tìm thấy sân.");
            }
            if (field.Venue?.OwnerId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền chỉnh sửa sân này.");
            }
            var images = await _unitOfWork.FieldImages.FindAsync(i => i.FieldId == fieldId);
            if(images.Count() + files.Count > 10)
            {
                throw new BadRequestException("Mỗi sân chỉ được phép có tối đa 10 hình ảnh.");
            }
            ImageValidator.ValidateFiles(files, 0, 10);
            foreach (var file in files)
            {
                var uploadResult = await _cloudinaryService.UploadImageAsync(file);
                if (uploadResult == null)
                {
                    throw new Exception("Có lỗi xảy ra khi tải lên hình ảnh.");
                }
                field.Images.Add(new FieldImage
                {
                    Id = uploadResult.PublicId,
                    ImageUrl = uploadResult.Url,
                    FieldId = fieldId
                });
            }
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteFieldImage(string publicId, string? userId)
        {
            if (userId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện hành động này.");
            }
            var image = await _unitOfWork.FieldImages.GetSingleAsync(f => f.Id == publicId);
            if (image == null)
            {
                throw new NotFoundException("Không tìm thấy hình ảnh.");
            }
            var field = await _unitOfWork.Fields.GetFieldWithVenueAsync(image.FieldId);
            if (field == null)
            {
                throw new NotFoundException("Không tìm thấy sân.");
            }
            if (field.Venue?.OwnerId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền xoá ảnh sân này.");
            }
            _unitOfWork.FieldImages.Remove(image);
            await _cloudinaryService.DeleteImageAsync(publicId);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<OwnerFieldDetailResponse> GetOwnerFieldDetailAsync(int id, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện hành động này.");
            }
            var field = await _unitOfWork.Fields.GetOwnerFieldDetail(id) ?? throw new NotFoundException("Không tìm thấy sân.");
            var venue = await _unitOfWork.Venues.GetByIdAsync(field.VenueId) ?? throw new NotFoundException("Không tìm thấy cơ sở của sân.");
            if (venue.OwnerId != ownerId)
            {
                throw new ForbiddenException("Bạn không có quyền truy cập sân này.");
            }
            return new OwnerFieldDetailResponse
            {
                Name = field.Name,
                Description = field.Description,
                SportTypeId = field.SportTypeId,
                Images = [.. field.Images.Select(i => i.ImageUrl)]
            };
        }
    }
}