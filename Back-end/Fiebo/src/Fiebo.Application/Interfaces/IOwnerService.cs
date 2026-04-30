using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.DTOs.Owner;

namespace Fiebo.Application.Interfaces
{
    public interface IOwnerService
    {
        Task<OwnerDashboardResponse> GetOwnerDashboardAsync(
            string ownerId,
            DateOnly? fromDate,
            DateOnly? toDate,
            int? venueId);

        Task<OwnerStatusResponse> GetOwnerStatusAsync(string ownerId);
    }
}