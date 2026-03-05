using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Interfaces
{
    public interface IVenueService
    {
        Task<List<VenueInfoResponse>> GetNearbyVenues(
            int? sportTypeId,
            double userLat,
            double userLng,
            int limit,
            double radiusKm);
        Task<List<VenueInfoResponse>> GetTopBookingVenuesAsync(
            int top,
            double userLat,
            double userLng);

        Task<VenueDetailResponse?> GetVenueDetail(int venueId);
        Task<PagedResult<ReviewDTO>> GetReviewsByVenue(
            int venueId,
            int page,
            int pageSize,
            string? sort);

        Task<PagedResult<VenueInfoResponse>> SearchVenuesByFieldAsync(
    SearchFieldsRequest request);
        Task<VenueSlotsResponse> GetVenueSchedule(int venueId, DateOnly date);
    }
}
