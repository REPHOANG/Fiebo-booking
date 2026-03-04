using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class VenueService : IVenueService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapService _mapService;
        private readonly IIdentityService _identityService;

        public VenueService(
            IUnitOfWork unitOfWork,
            IMapService mapService,
            IIdentityService identityService
            )
        {
            _unitOfWork = unitOfWork;
            _mapService = mapService;
            _identityService = identityService;
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

                        ThumbnailUrl = v.Fields
                            .SelectMany(f => f.Images)
                            .Select(i => i.ImageUrl)
                            .FirstOrDefault(),

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

                    ThumbnailUrl = v.Fields
                        .SelectMany(f => f.Images)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault(),

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
            if (venue == null)
            {
                return null;
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
                request.Location,
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
                        ThumbnailUrl = v.Fields
                            .SelectMany(f => f.Images)
                            .Select(i => i.ImageUrl)
                            .FirstOrDefault(),
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
    }
}
