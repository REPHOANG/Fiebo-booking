using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;

namespace Fiebo.Domain.Repositories
{
    public interface IVenueRepository : IRepository<Venue>
    {
        Task<List<VenueInfoStat>> GetNearestVenuesAsync(
            double userLat,
            double userLng,
            int? sportTypeId,
            int limit,
            double? radiusKm);

        Task<PagedResult<VenueInfoStat>> SearchVenuesByFieldAsync(
            string? locationKeyword,
            DateOnly? bookingDate,
            TimeSpan? bookingTime,
            int? sportTypeId,
            double userLat,
            double userLng,
            int page,
            int pageSize,
            double? radiusKm);

        Task<List<VenueInfoStat>> GetTopBookingVenueStatsAsync(int top);
    }
}
