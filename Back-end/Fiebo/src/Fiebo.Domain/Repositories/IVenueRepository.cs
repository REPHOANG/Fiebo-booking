using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;

namespace Fiebo.Domain.Repositories
{
    public interface IVenueRepository : IRepository<Venue>
    {
        Task<List<Venue>> GetNearestVenuesAsync(
            double userLat,
            double userLng,
            int? sportTypeId,
            int limit,
            double radiusKm);

        Task<List<Venue>> GetTopBookingVenuesAsync(int top);

        Task<Venue?> GetVenueDetailById(int venueId);

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
    }
}
