using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories;

public interface IVenueServiceItemRepository : IRepository<VenueServiceItem>
{
    Task<bool> IsServiceInUseAsync(int serviceId, CancellationToken cancellationToken = default);
    Task<PagedResult<VenueServiceItem>> GetPagedServicesAsync(
        int venueId,
        string? keyword,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}