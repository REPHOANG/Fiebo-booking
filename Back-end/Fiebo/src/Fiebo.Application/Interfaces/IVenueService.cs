using Fiebo.Application.DTOs.Field;
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
            double? radiusKm);

        Task<List<VenueInfoResponse>> GetTopBookingVenuesAsync(
            int top,
            double userLat,
            double userLng);

        Task<PagedResult<VenueInfoResponse>> SearchVenuesByFieldAsync(
            string? location,
            DateOnly? date,
            TimeSpan? time,
            int? sportTypeId,
            double userLat,
            double userLng,
            int page,
            int pageSize,
            double? radiusKm);
    }
}
