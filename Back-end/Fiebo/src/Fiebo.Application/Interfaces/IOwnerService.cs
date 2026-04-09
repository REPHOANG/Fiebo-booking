using Fiebo.Application.DTOs.Booking;

namespace Fiebo.Application.Interfaces
{
    public interface IOwnerService
    {
        Task<OwnerDashboardResponse> GetOwnerDashboardAsync(
            string ownerId,
            DateOnly? fromDate,
            DateOnly? toDate,
            int? venueId);
    }
}