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

        Task<PagedResult<Venue>> SearchVenuesByFieldAsync(
            string? locationKeyword,
            DateOnly? bookingDate,
            TimeOnly? bookingTime,
            int? sportTypeId,
            double userLat,
            double userLng,
            int page,
            int pageSize,
            double? radiusKm);
        Task<List<Venue>> GetVenuesByOwnerAsync(string ownerId);
        Task<List<Venue>> GetVenuesWithStaffAsync(string ownerId);
        Task<Venue?> GetVenueWithDocumentsAsync(int venueId);
        Task<bool> IsVenueNameExistsForOwnerAsync(string ownerId, string name, int excludeVenueId);
    }
}
