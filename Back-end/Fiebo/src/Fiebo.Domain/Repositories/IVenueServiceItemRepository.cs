using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories;

public interface IVenueServiceItemRepository
{
    void Add(VenueServiceItem item);
    void Update(VenueServiceItem item);
    void Remove(VenueServiceItem item);
    Task<bool> IsServiceInUseAsync(int serviceId, CancellationToken cancellationToken = default);
    Task<VenueServiceItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PagedResult<VenueServiceItem>> GetPagedServicesAsync(
        int venueId,
        string? keyword,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}