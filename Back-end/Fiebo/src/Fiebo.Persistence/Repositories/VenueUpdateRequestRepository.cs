using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories
{
    public class VenueUpdateRequestRepository : Repository<VenueUpdateRequest>, IVenueUpdateRequestRepository
    {
        public VenueUpdateRequestRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<VenueUpdateRequest>> GetPendingRequestsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.VenueUpdateRequests
                .Where(x => x.Status == "Pending")
                .Include(x => x.Venue)
                .OrderByDescending(x => x.CreatedAt)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        public async Task<VenueUpdateRequest?> GetByIdWithVenueAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.VenueUpdateRequests
                .Include(x => x.Venue)
                    .ThenInclude(v => v.Documents)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }
    }
}
