using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.DTOs.Slot;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Validators;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Fiebo.Application.Services
{
    public class VenueService : IVenueService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapService _mapService;
        private readonly IIdentityService _identityService;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ILogger<VenueService> _logger;

        public VenueService(
            IUnitOfWork unitOfWork,
            IMapService mapService,
            IIdentityService identityService,
            ICloudinaryService cloudinaryService,
            ILogger<VenueService> logger
            )
        {
            _unitOfWork = unitOfWork;
            _mapService = mapService;
            _identityService = identityService;
            _cloudinaryService = cloudinaryService;
            _logger = logger;
        }

        public async Task<List<VenueInfoResponse>> GetNearbyVenues(
            int? sportTypeId,
            double userLat,
            double userLng,
            int limit,
            double radiusKm)
        {
            var venues = await _unitOfWork.Venues
        .GetNearestVenuesAsync(userLat, userLng, sportTypeId, limit, radiusKm);

            if (venues.Count == 0)
                return [];

            var venueIds = venues.Select(v => v.Id).ToList();

            var bookingMap = await _unitOfWork.BookingDetails
                .CountCompletedBookingsByVenueAsync(venueIds);

            var ratingMap = await _unitOfWork.Reviews
                .GetAveragesByVenueAsync(venueIds);

            // Distance
            var locationList = venues.Select(v => new VenueLocationDto
            {
                VenueId = v.Id,
                Latitude = v.Latitude,
                Longitude = v.Longitude
            }).ToList();

            var distances = await _mapService
                .GetDistancesAsync(userLat, userLng, locationList);

            var result = venues
                .Select(v =>
                {
                    distances.TryGetValue(v.Id, out var distanceKm);

                    return new VenueInfoResponse
                    {
                        VenueId = v.Id,
                        VenueName = v.Name,

                        Province = v.Province?.Name,
                        Ward = v.Ward?.Name,
                        AddressDetail = v.AddressDetail,

                        OpenTime = v.OpenTime,
                        CloseTime = v.CloseTime,

                        BookingCount = bookingMap.GetValueOrDefault(v.Id, 0),
                        Rating = ratingMap.GetValueOrDefault(v.Id, 0),

                        ThumbnailUrl = v.ThumbnailUrl,

                        DistanceKm = Math.Round(distanceKm, 2)
                    };
                })
                .OrderBy(x => x.DistanceKm)
                .ToList();

            return result;
        }

        public async Task<List<VenueInfoResponse>> GetTopBookingVenuesAsync(
         int top,
         double userLat,
         double userLng)
        {
            if (top <= 0) top = 10;

            var venues = await _unitOfWork.Venues
                .GetTopBookingVenuesAsync(top);

            if (venues.Count == 0)
                return [];

            // Lấy list ID
            var venueIds = venues.Select(v => v.Id).ToList();

            // Lấy location
            var locationList = venues.Select(v => new VenueLocationDto
            {
                VenueId = v.Id,
                Latitude = v.Latitude,
                Longitude = v.Longitude
            }).ToList();

            var distances = await _mapService
                .GetDistancesAsync(userLat, userLng, locationList);

            var ratingDict = await _unitOfWork.Reviews
                .GetAveragesByVenueAsync(venueIds);

            var bookingDict = await _unitOfWork.BookingDetails
                .CountCompletedBookingsByVenueAsync(venueIds);

            var result = venues.Select(v =>
            {
                ratingDict.TryGetValue(v.Id, out var rating);
                bookingDict.TryGetValue(v.Id, out var bookingCount);
                distances.TryGetValue(v.Id, out var distanceKm);

                return new VenueInfoResponse
                {
                    VenueId = v.Id,
                    VenueName = v.Name,

                    Province = v.Province?.Name,
                    Ward = v.Ward?.Name,
                    AddressDetail = v.AddressDetail,

                    OpenTime = v.OpenTime,
                    CloseTime = v.CloseTime,

                    Rating = rating,
                    BookingCount = bookingCount,

                    ThumbnailUrl = v.ThumbnailUrl,

                    DistanceKm = Math.Round(distanceKm, 2)
                };
            })
            .OrderByDescending(x => x.BookingCount)
            .ToList();

            return result;
        }

        public async Task<VenueDetailResponse?> GetVenueDetail(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetVenueDetailById(venueId);
            if (venue == null || venue.Status != VenueStatus.Active)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            return new VenueDetailResponse
            {
                Name = venue.Name,
                OpenTime = venue.OpenTime,
                CloseTime = venue.CloseTime,
                Description = venue.Description,
                AverageRating = await _unitOfWork.Reviews.GetAverageByVenueAsync(venueId),
                RatingCount = await _unitOfWork.Reviews.CountByVenueAsync(venueId),
                BookingCount = await _unitOfWork.BookingDetails.CountCompletedBookingByVenueAsync(venueId),
                Province = venue.Province?.Name,
                Ward = venue.Ward?.Name,
                AddressDetail = venue.AddressDetail,
                Latitude = venue.Latitude,
                Longitude = venue.Longitude
            };
        }

        public async Task<PagedResult<ReviewDTO>> GetReviewsByVenue(int venueId, int page, int pageSize, string? sort)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null || venue.Status != VenueStatus.Active)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            var result = await _unitOfWork.Reviews
                .GetByVenueAsync(venueId, page, pageSize, sort);
            var userIds = result.Items.Select(r => r.UserId).ToList();
            var userMap = await _identityService.GetUserFullNameAsync(userIds);
            var dtoItems = result.Items.Select(r => new ReviewDTO
            {
                Name = userMap.GetValueOrDefault(r.UserId, "Unknown"),
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                Images = [.. r.Images.Select(i => i.ImageUrl)]
            }).ToList();

            return new PagedResult<ReviewDTO>
            {
                Items = dtoItems,
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems
            };
        }

        public async Task<PagedResult<VenueInfoResponse>> SearchVenuesByFieldAsync(
            SearchFieldsRequest request)
        {
            var page = request.Page <= 0 ? 1 : request.Page;
            var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            var venues = await _unitOfWork.Venues.SearchVenuesByFieldAsync(
                request.ProvinceId,
                request.WardId,
                request.Name,
                request.Date,
                request.Time,
                request.SportTypeId,
                request.UserLat,
                request.UserLng,
                page,
                pageSize,
                request.RadiusKm);

            if (!venues.Items.Any())
            {
                return new PagedResult<VenueInfoResponse>
                {
                    Page = venues.Page,
                    PageSize = venues.PageSize,
                    TotalItems = venues.TotalItems,
                    Items = []
                };
            }

            var venueIds = venues.Items.Select(v => v.Id).ToList();
            var bookingMap = await _unitOfWork.BookingDetails.CountCompletedBookingsByVenueAsync(venueIds);
            var ratingMap = await _unitOfWork.Reviews.GetAveragesByVenueAsync(venueIds);

            var locationList = venues.Items
                .Select(v => new VenueLocationDto
                {
                    VenueId = v.Id,
                    Latitude = v.Latitude,
                    Longitude = v.Longitude
                })
                .ToList();

            var distances = await _mapService.GetDistancesAsync(request.UserLat, request.UserLng, locationList);

            var items = venues.Items
                .Select(v =>
                {
                    distances.TryGetValue(v.Id, out var distanceKm);

                    return new VenueInfoResponse
                    {
                        VenueId = v.Id,
                        VenueName = v.Name,
                        Province = v.Ward?.Province?.Name ?? v.Province?.Name,
                        Ward = v.Ward?.Name,
                        AddressDetail = v.AddressDetail,
                        OpenTime = v.OpenTime,
                        CloseTime = v.CloseTime,
                        BookingCount = bookingMap.GetValueOrDefault(v.Id, 0),
                        Rating = Math.Round(ratingMap.GetValueOrDefault(v.Id, 0), 1),
                        ThumbnailUrl = v.ThumbnailUrl,
                        DistanceKm = Math.Round(distanceKm, 2)
                    };
                })
                .ToList();

            return new PagedResult<VenueInfoResponse>
            {
                Page = venues.Page,
                PageSize = venues.PageSize,
                TotalItems = venues.TotalItems,
                Items = items
            };
        }

        public async Task<VenueSlotsResponse> GetVenueSchedule(int venueId, DateOnly date)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.Status != VenueStatus.Active)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            var sportTypes = await _unitOfWork.Fields.GetSportTypesByVenueAsync(venueId);

            var slots = await _unitOfWork.TimeSlots
                .GetTimeSlotsByVenueAndDateAsync(venueId, date);

            var fields = await _unitOfWork.Fields.GetFieldsWithBookingsAsync(venueId, date, FieldStatus.Active);

            var events = await _unitOfWork.TicketEventsDetails
                .GetEventsByVenueAndDateAsync(venueId, date);

            var eventsByField = events
                .GroupBy(e => e.FieldId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = new VenueSlotsResponse
            {
                VenueId = venueId,
                Date = date,
                SportTypes = []
            };

            foreach (var sportType in sportTypes)
            {
                var sportSlots = slots
                    .Where(s => s.SportTypeId == sportType.Id)
                    .Select(s => new SlotResponse
                    {
                        SlotId = s.Id,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime,
                        Price = s.Price
                    })
                    .ToList();

                result.SportTypes.Add(new SportTypeSlotResponse
                {
                    SportTypeId = sportType.Id,
                    SportTypeName = sportType.Name,
                    Slots = sportSlots,
                    Fields = [.. fields.Where(field => field.SportTypeId == sportType.Id)
                    .Select(field =>
            {
                var bookingSlots = field.BookingDetails
                    .Select(bd => new UnavailableSlotResponse
                    {
                        EventId = null,
                        SlotId = bd.SlotId,
                        Status = bd.Booking.Status.ToString()
                    });

                var eventSlots = eventsByField.TryGetValue(field.Id, out var fieldEvents)
                    ? fieldEvents.Select(e => new UnavailableSlotResponse
                    {
                        EventId = e.Event.Id,
                        SlotId = e.SlotId,
                        Status = e.Event.Status.ToString()
                    })
                    : Enumerable.Empty<UnavailableSlotResponse>();

                return new FieldSlotResponse
                {
                    FieldId = field.Id,
                    FieldName = field.Name,
                    UnavailableSlots = [..
                        bookingSlots.Concat(eventSlots)
                    ]
                };
            })]
                });
            }

            return result;
        }

        public async Task<List<OwnerVenueListResponse>> GetVenuesByOwnerAsync(string ownerId)
        {
            var venues = await _unitOfWork.Venues.GetVenuesByOwnerAsync(ownerId);
            return [.. venues.Select(v => new OwnerVenueListResponse
            {
                VenueId = v.Id,
                Name = v.Name,
                ThumbnailUrl = v?.ThumbnailUrl ?? "",
                Province = v.Province?.Name ?? "",
                Ward = v.Ward?.Name ?? "",
                Status = v.Status.ToString(),
                TotalFields = v.Fields.Count
            })];
        }

        public async Task DeactivateVenueAsync(int venueId, string ownerId)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }

            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền cập nhật cơ sở này");
            }

            if (venue.Status == VenueStatus.Active)
            {
                var hasUpcoming = await _unitOfWork.BookingDetails.HasUpcomingBookingsForVenueAsync(venueId);

                if (hasUpcoming)
                {
                    throw new BadRequestException(
                        "Không thể tắt cơ sở. Hiện đang có lịch đặt sắp tới. " +
                        "Vui lòng xử lý hoặc hủy các lịch đặt trước khi cập nhật.");
                }

                venue.Status = VenueStatus.Inactive;
            }
            else
            {
                venue.Status = VenueStatus.Active;
            }

            venue.UpdatedAt = DateTime.Now;
            _unitOfWork.Venues.Update(venue);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<VenueSlotsResponse> GetOwnerVenueScheduleAsync(int venueId, string ownerId, DateOnly date)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền xem lịch sân này");
            }
            return await GetVenueSchedule(venueId, date);
        }



        public async Task<CreateVenueResponse> CreateVenueAsync(CreateVenueRequest request, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để tạo sân");
            }
            if (request.CloseTime <= request.OpenTime)
            {
                throw new BadRequestException(
                    "Giờ đóng cửa phải sau giờ mở cửa. Vui lòng thiết lập lại thời gian hoạt động.");
            }
            if(request.CloseTime.Minute % 30 != 0 || request.OpenTime.Minute % 30 != 0)
            {
                throw new BadRequestException(
                    "Giờ mở cửa và đóng cửa phải là các khoảng thời gian chẵn 30 phút");
            }
            var province = await _unitOfWork.Provinces.GetByIdAsync(request.ProvinceId);
            if (province == null)
            {
                throw new BadRequestException("Tỉnh/Thành phố không hợp lệ");
            }
            var ward = await _unitOfWork.Wards.GetByIdAsync(request.WardId);
            if(ward == null || ward.ProvinceId != request.ProvinceId)
            {
                throw new BadRequestException("Phường/Xã không hợp lệ hoặc không thuộc tỉnh/thành phố đã chọn");
            }

            var file = request.Thumbnail;
            var fileList = file != null ? new List<IFormFile> { file } : [];
            ImageValidator.ValidateFiles(fileList, 0, 1);

            var venue = new Venue
            {
                Name = request.Name,
                OpenTime = request.OpenTime,
                CloseTime = request.CloseTime,
                Description = request.Description,
                AddressDetail = request.AddressDetail,
                ProvinceId = request.ProvinceId,
                WardId = request.WardId,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                OwnerId = ownerId,
                ThumbnailUrl = file != null ? (await _cloudinaryService.UploadImageAsync(file)).Url : null,
                Status = VenueStatus.Draft
            };
            _unitOfWork.Venues.Add(venue);
            await _unitOfWork.SaveChangesAsync();
            return new CreateVenueResponse
            {
                VenueId = venue.Id,
                Status = venue.Status.ToString()
            };

        }

        public async Task UploadVenueDocumentAsync(int venueId, string? ownerId, CreateVenueDocumentRequest request)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để tải lên giấy tờ");
            }
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền tải lên giấy tờ cho sân này");
            }
            ImageValidator.ValidateFiles(request.BusinessDocument.Images);
            ImageValidator.ValidateFiles(request.LandUseDocument.Images);
            var businessDoc = new VenueDocument
            {
                VenueId = venueId,
                DocumentType = DocumentType.BusinessLicense,
                IssueDate = request.BusinessDocument.IssueDate,
                ExpiryDate = request.BusinessDocument.ExpiryDate,
            };

            var landDoc = new VenueDocument
            {
                VenueId = venueId,
                DocumentType = DocumentType.LandUse,
                IssueDate = request.LandUseDocument.IssueDate,
                ExpiryDate = request.LandUseDocument.ExpiryDate
            };

            _unitOfWork.VenueDocuments.Add(businessDoc);
            _unitOfWork.VenueDocuments.Add(landDoc);
            await _unitOfWork.SaveChangesAsync();
            var images = new List<VenueDocumentImage>();

            await UploadDocumentImagesAsync(request.BusinessDocument.Images, businessDoc.Id, images);
            await UploadDocumentImagesAsync(request.LandUseDocument.Images, landDoc.Id, images);

            _unitOfWork.VenueDocumentImages.AddRange(images);
            await _unitOfWork.SaveChangesAsync();
        }

        private async Task UploadDocumentImagesAsync(
            IEnumerable<IFormFile> files,
            int documentId,
            List<VenueDocumentImage> result)
        {
            foreach (var file in files)
            {
                try
                {
                    var url = (await _cloudinaryService.UploadImageAsync(file)).Url;

                    result.Add(new VenueDocumentImage
                    {
                        DocumentId = documentId,
                        ImageUrl = url
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Upload ảnh lỗi");
                    throw new BadRequestException("Upload ảnh thất bại");
                }
            }
        }


        public async Task<OwnerVenueDetailResponse> GetOwnerVenueDetailAsync(int venueId, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để xem bản nháp");
            }
            var venue = await _unitOfWork.Venues.GetVenueWithDocumentsAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền xem bản nháp của sân này");
            }
            return new OwnerVenueDetailResponse
            {
                Id = venue.Id,
                Name = venue.Name,
                OpenTime = venue.OpenTime,
                CloseTime = venue.CloseTime,
                Description = venue.Description,
                AddressDetail = venue.AddressDetail,
                ThumbnailUrl = venue.ThumbnailUrl,
                ProvinceId = venue.ProvinceId,
                ProvinceName = venue.Province?.Name,
                WardId = venue.WardId,
                WardName = venue.Ward?.Name,
                Longitude = venue.Longitude,
                Latitude = venue.Latitude,
                Status = venue.Status.ToString(),
                LandDocument = venue.Documents.FirstOrDefault(d => d.DocumentType == DocumentType.LandUse) is VenueDocument landDoc
                    ? new VenueDocumentResponse
                    {
                        IssueDate = landDoc.IssueDate,
                        ExpiryDate = landDoc.ExpiryDate,
                        Images = [.. landDoc.Images.Select(i => i.ImageUrl)]
                    }
                    : null,
                BusinessLicense = venue.Documents.FirstOrDefault(d => d.DocumentType == DocumentType.BusinessLicense) is VenueDocument bizDoc
                    ? new VenueDocumentResponse
                    {
                        IssueDate = bizDoc.IssueDate,
                        ExpiryDate = bizDoc.ExpiryDate,
                        Images = [.. bizDoc.Images.Select(i => i.ImageUrl)]
                    }
                    : null
            };
        }

        public async Task SubmitVenueDraftAsync(int venueId, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để gửi duyệt bản nháp");
            }
            var venue = await _unitOfWork.Venues.GetVenueWithDocumentsAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền gửi duyệt bản nháp của sân này");
            }
            if (venue.Status != VenueStatus.Draft)
            {
                throw new BadRequestException("Chỉ có thể gửi duyệt bản nháp của sân đang ở trạng thái Draft");
            }
            if (venue.Documents.Count(d => d.DocumentType == DocumentType.BusinessLicense) == 0 ||
               venue.Documents.Count(d => d.DocumentType == DocumentType.LandUse) == 0)
            {
                throw new BadRequestException("Vui lòng tải lên đầy đủ giấy tờ trước khi gửi duyệt");
            }
            venue.Status = VenueStatus.Pending;
            _unitOfWork.Venues.Update(venue);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UpdateVenueAsync(int venueId, UpdateVenueRequest request, string ownerId)
        {
            // 1. Load venue with documents (tracked for updates)
            var venue = await _unitOfWork.Venues.GetVenueWithDocumentsTrackedAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            // BR-03: OwnerId is immutable — only the owner can edit
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền cập nhật cơ sở này.");
            }

            // E2 / MSG-E02: CloseTime must be after OpenTime
            if (request.CloseTime <= request.OpenTime)
            {
                throw new BadRequestException(
                    "Giờ đóng cửa phải sau giờ mở cửa. Vui lòng thiết lập lại thời gian hoạt động.");
            }


            // E3 / MSG-E05: TimeSlot conflict when shortening hours on Active venue
            if (venue.Status == VenueStatus.Active)
            {
                bool isHoursShortened = request.OpenTime > venue.OpenTime
                                    || request.CloseTime < venue.CloseTime;

                if (isHoursShortened)
                {
                    var hasConflict = await _unitOfWork.TimeSlots
                        .HasTimeSlotsOutsideRangeAsync(venueId, request.OpenTime, request.CloseTime);

                    if (hasConflict)
                    {
                        throw new BadRequestException(
                            "Không thể rút ngắn giờ hoạt động. Hiện có các khung giờ hoặc đặt chỗ đang hoạt động " +
                            "nằm ngoài khung giờ mới. Vui lòng xử lý trước.");
                    }
                }
            }

            // BR-01: Status Transition (State Machine)
            // Rejected(3) -> Pending(2) on any save
            // Draft(4) -> stays Draft(4)
            // Active(1), Inactive(0), Pending(2) -> unchanged (BR-02 may override below)
            if (venue.Status == VenueStatus.Rejected)
            {
                venue.Status = VenueStatus.Pending;
            }

            // BR-02: Critical Info Lock — Active venue with address change -> Pending
            if (venue.Status == VenueStatus.Active || venue.Status == VenueStatus.Inactive)
            {
                bool addressChanged = venue.ProvinceId != request.ProvinceId
                                   || venue.WardId != request.WardId
                                   || venue.AddressDetail != request.AddressDetail;

                if (addressChanged)
                {
                    venue.Status = VenueStatus.Pending;
                }
            }

            // Apply field updates
            venue.Name = request.Name;
            venue.Description = request.Description;
            venue.AddressDetail = request.AddressDetail;
            venue.ProvinceId = request.ProvinceId;
            venue.WardId = request.WardId;
            venue.Longitude = request.Longitude;
            venue.Latitude = request.Latitude;
            venue.OpenTime = request.OpenTime;
            venue.CloseTime = request.CloseTime;

            // Handle thumbnail upload
            if (request.ThumbnailImage is { Length: > 0 })
            {
                var fileList = new List<IFormFile> { request.ThumbnailImage };
                ImageValidator.ValidateFiles(fileList, 1, 1);

                var uploadResult = await _cloudinaryService.UploadImageAsync(request.ThumbnailImage);
                venue.ThumbnailUrl = uploadResult.Url;
            }

            venue.UpdatedAt = DateTime.Now;

            // Handle Documents update
            bool documentsChanged = false;

            if (request.BusinessDocument != null)
            {
                var bizDoc = venue.Documents.FirstOrDefault(d => d.DocumentType == DocumentType.BusinessLicense);
                if (bizDoc == null)
                {
                    bizDoc = new VenueDocument { VenueId = venueId, DocumentType = DocumentType.BusinessLicense };
                    _unitOfWork.VenueDocuments.Add(bizDoc);
                }

                if (request.BusinessDocument.IssueDate.HasValue)
                {
                    bizDoc.IssueDate = request.BusinessDocument.IssueDate.Value;
                    documentsChanged = true;
                }
                if (request.BusinessDocument.ExpiryDate.HasValue)
                {
                    bizDoc.ExpiryDate = request.BusinessDocument.ExpiryDate.Value;
                    documentsChanged = true;
                }

                if (request.BusinessDocument.Images != null && request.BusinessDocument.Images.Any())
                {
                    ImageValidator.ValidateFiles(request.BusinessDocument.Images);
                    bizDoc.Images.Clear(); // Remove old images
                    var newImages = new List<VenueDocumentImage>();
                    await UploadDocumentImagesAsync(request.BusinessDocument.Images, bizDoc.Id, newImages);
                    foreach (var img in newImages) bizDoc.Images.Add(img);
                    documentsChanged = true;
                }
            }

            if (request.LandUseDocument != null)
            {
                var landDoc = venue.Documents.FirstOrDefault(d => d.DocumentType == DocumentType.LandUse);
                if (landDoc == null)
                {
                    landDoc = new VenueDocument { VenueId = venueId, DocumentType = DocumentType.LandUse };
                    _unitOfWork.VenueDocuments.Add(landDoc);
                }

                if (request.LandUseDocument.IssueDate.HasValue)
                {
                    landDoc.IssueDate = request.LandUseDocument.IssueDate.Value;
                    documentsChanged = true;
                }
                if (request.LandUseDocument.ExpiryDate.HasValue)
                {
                    landDoc.ExpiryDate = request.LandUseDocument.ExpiryDate.Value;
                    documentsChanged = true;
                }

                if (request.LandUseDocument.Images != null && request.LandUseDocument.Images.Any())
                {
                    ImageValidator.ValidateFiles(request.LandUseDocument.Images);
                    landDoc.Images.Clear(); // Remove old images
                    var newImages = new List<VenueDocumentImage>();
                    await UploadDocumentImagesAsync(request.LandUseDocument.Images, landDoc.Id, newImages);
                    foreach (var img in newImages) landDoc.Images.Add(img);
                    documentsChanged = true;
                }
            }

            // BR-02 extended: Demote to Pending if documents changed
            if (documentsChanged && venue.Status == VenueStatus.Active)
            {
                venue.Status = VenueStatus.Pending;
            }

            _unitOfWork.Venues.Update(venue);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<int> AddVenueServiceAsync(int venueId, string ownerId, AddVenueServiceRequest request)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở");
            }
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền thêm dịch vụ cho sân này");
            }

            string? imageUrl = null;
            if (request.Image != null)
            {
                ImageValidator.ValidateFiles(new List<IFormFile> { request.Image }, 0, 1);
                imageUrl = (await _cloudinaryService.UploadImageAsync(request.Image)).Url;
            }

            var serviceItem = new VenueServiceItem
            {
                VenueId = venueId,
                Name = request.ServiceName,
                Description = request.Description,
                Price = request.Price,
                ImageUrl = imageUrl
            };

            _unitOfWork.VenueServiceItems.Add(serviceItem);
            await _unitOfWork.SaveChangesAsync();

            return serviceItem.Id;
        }

        public async Task UpdateVenueServiceAsync(int serviceId, string ownerId, UpdateVenueServiceRequest request, CancellationToken cancellationToken = default)
        {
            var existingService = await _unitOfWork.VenueServiceItems.GetByIdAsync(serviceId, cancellationToken);

            if (existingService == null || existingService.IsDeleted)
            {
                throw new NotFoundException("Không tìm thấy dịch vụ hoặc dịch vụ đã bị xóa");
            }

            var venue = await _unitOfWork.Venues.GetByIdAsync(existingService.VenueId);
            if (venue == null || venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền chỉnh sửa dịch vụ của sân này");
            }

            string? imageUrl = existingService.ImageUrl;
            if (request.Image != null)
            {
                ImageValidator.ValidateFiles(new List<IFormFile> { request.Image }, 0, 1);
                imageUrl = (await _cloudinaryService.UploadImageAsync(request.Image)).Url;
            }

            existingService.IsDeleted = true;
            _unitOfWork.VenueServiceItems.Update(existingService);

            var newServiceVersion = new VenueServiceItem
            {
                VenueId = existingService.VenueId,
                Name = request.ServiceName,
                Description = request.Description,
                Price = request.Price,
                ImageUrl = imageUrl,
                IsDeleted = false
            };

            _unitOfWork.VenueServiceItems.Add(newServiceVersion);

            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteVenueServiceAsync(int serviceId, string ownerId, CancellationToken cancellationToken = default)
        {
            var serviceItem = await _unitOfWork.VenueServiceItems.GetByIdAsync(serviceId, cancellationToken);

            if (serviceItem == null || serviceItem.IsDeleted)
            {
                throw new NotFoundException("Không tìm thấy dịch vụ");
            }

            var venue = await _unitOfWork.Venues.GetByIdAsync(serviceItem.VenueId);
            if (venue == null || venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền xóa dịch vụ của sân này");
            }

            var isServiceInUse = await _unitOfWork.VenueServiceItems.IsServiceInUseAsync(serviceId, cancellationToken);
            if (isServiceInUse)
            {
                throw new BadRequestException("Dịch vụ đang được sử dụng trong các lịch đặt sắp tới, không thể xóa.");
            }

            serviceItem.IsDeleted = true;

            _unitOfWork.VenueServiceItems.Update(serviceItem);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<PagedResult<VenueServiceDetailResponse>> GetVenueServicesAsync(int venueId, GetVenueServicesRequest request, CancellationToken cancellationToken = default)
        {
            var pagedResult = await _unitOfWork.VenueServiceItems.GetPagedServicesAsync(
                venueId,
                request.SearchKeyword,
                request.Page,
                request.PageSize,
                cancellationToken);

            var dtos = pagedResult.Items.Select(s => new VenueServiceDetailResponse
            {
                Id = s.Id,
                ServiceName = s.Name,
                Description = s.Description,
                Price = s.Price,

                ImageUrl = s.ImageUrl
            }).ToList();

            return new PagedResult<VenueServiceDetailResponse>
            {
                Items = dtos,
                TotalItems = pagedResult.TotalItems,
                Page = pagedResult.Page,
                PageSize = pagedResult.PageSize
            };
        }

        public async Task<List<OwnerVenueSelectOptionResponse>> GetOwnerVenueSelectOptionAsync(string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedAccessException(ownerId);
            }
            var venues = await _unitOfWork.Venues.FindAsync(v => v.OwnerId == ownerId);
            return [.. venues.Select(v => new OwnerVenueSelectOptionResponse
            {
                Id = v.Id,
                Name = v.Name
            })];
        }
    }
}
