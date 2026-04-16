using Fiebo.Application.DTOs.Admin;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Interfaces
{
    public interface IAdminVenueService
    {
        Task<PagedResult<PendingVenueListItemResponse>> GetPendingVenuesAsync(int page, int pageSize);
        Task<PendingVenueDetailResponse> GetPendingVenueDetailAsync(int venueId);
        Task ApproveVenueAsync(int venueId);
        Task RejectVenueAsync(int venueId, RejectVenueRequest request);
    }
}
