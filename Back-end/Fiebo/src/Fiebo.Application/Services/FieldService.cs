using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class FieldService : IFieldService
    {
        private readonly IUnitOfWork _unitOfWork;
        public FieldService(
            IUnitOfWork unitOfWork
            )
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize)
        {
            var fields = await _unitOfWork.Fields.GetFieldsByVenue(venueId, page, pageSize);
            var fieldIds = fields.Items.Select(f => f.Id).ToList();
            var bookingCounts =
                await _unitOfWork.BookingDetails
                    .CountCompletedBookingByFieldsAsync(fieldIds);

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

        public async Task ChangeFieldStatusAsync(int venueId, int fieldId, FieldStatus newStatus, string userId)
        {
            // BR-55: Verify venue exists and belongs to the current user
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null || venue.OwnerId != userId)
            {
                throw new UnauthorizedException("Bạn không có quyền thay đổi trạng thái sân trong cơ sở này.");
            }

            var field = await _unitOfWork.Fields.GetByIdAsync(fieldId);
            if (field == null || field.VenueId != venueId)
            {
                throw new NotFoundException("Không tìm thấy sân hợp lệ.");
            }

            if (field.Status == newStatus)
            {
                throw new BadRequestException("Sân đã ở trạng thái này rồi.");
            }

            // BR-56 / E1: Block deactivation if upcoming bookings exist
            if (newStatus == FieldStatus.Inactive)
            {
                var hasUpcoming = await _unitOfWork.BookingDetails
                    .HasUpcomingBookingsForFieldAsync(fieldId);

                if (hasUpcoming)
                {
                    throw new BadRequestException(
                        "Không thể thay đổi trạng thái. Sân này đang có lịch đặt sắp tới. " +
                        "Vui lòng xử lý hoặc hủy các lịch đặt trước khi cập nhật.");
                }
            }

            field.Status = newStatus;
            field.UpdatedAt = DateTime.Now;
            _unitOfWork.Fields.Update(field);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<int> CreateFieldAsync(
            int venueId,
            CreateFieldRequest request,
            List<string> imageUrls,
            string userId,
            string userRole)
        {
            // BR-69: Field must belong to an existing venue
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            // Authorization: Admin can create in any venue; Owner only in their own
            bool isAdmin = userRole == AppRoles.Admin;
            if (!isAdmin && venue.OwnerId != userId)
            {
                throw new UnauthorizedException("Bạn không có quyền tạo sân trong cơ sở này.");
            }

            // BR-71 / E2: Duplicate field name within the same venue
            var nameExists = await _unitOfWork.Fields
                .IsFieldNameExistsInVenueAsync(venueId, request.Name);

            if (nameExists)
            {
                throw new ResourceConflictException(
                    "Tên sân này đã tồn tại trong cơ sở. Vui lòng chọn một tên khác.");
            }

            // BR-70: Default status = Active
            var field = new Field
            {
                Name = request.Name,
                Description = request.Description,
                SportTypeId = request.SportTypeId,
                VenueId = venueId,
                Status = FieldStatus.Active
            };

            _unitOfWork.Fields.Add(field);

            foreach (var url in imageUrls)
            {
                field.Images.Add(new FieldImage
                {
                    ImageUrl = url,
                    Field = field
                });
            }

            await _unitOfWork.SaveChangesAsync();

            return field.Id;
        }
    }
}
