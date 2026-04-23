using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;

namespace Fiebo.Domain.Repositories
{
    public interface IVenueUpdateRequestRepository : IRepository<VenueUpdateRequest>
    {
        Task<List<VenueUpdateRequest>> GetPendingRequestsAsync(CancellationToken cancellationToken = default);
        Task<VenueUpdateRequest?> GetByIdWithVenueAsync(int id, CancellationToken cancellationToken = default);
    }
}
