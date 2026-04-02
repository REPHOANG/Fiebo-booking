using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories;

public class VenueServiceItemRepository : IVenueServiceItemRepository
{
    private readonly FieboDbContext _context;

    public VenueServiceItemRepository(FieboDbContext context)
    {
        _context = context;
    }

    public void Add(VenueServiceItem item)
    {
        _context.VenueServiceItems.Add(item);
    }

    public void Update(VenueServiceItem item)
    {
        _context.VenueServiceItems.Update(item);
    }

    public void Remove(VenueServiceItem item)
    {
        _context.VenueServiceItems.Remove(item);
    }

    public async Task<VenueServiceItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.VenueServiceItems
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> IsServiceInUseAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        return await _context.BookingServiceItems
            .AnyAsync(bsi => bsi.VenueServiceItemId == serviceId
                          && bsi.Booking.BookingDate >= today
                          && bsi.Booking.Status != 0, 
                          cancellationToken);
    }

    public async Task<PagedResult<VenueServiceItem>> GetPagedServicesAsync(
    int venueId,
    string? keyword,
    int page,
    int pageSize,
    CancellationToken cancellationToken = default)
    {
        var query = _context.VenueServiceItems
            .Where(x => x.VenueId == venueId && !x.IsDeleted)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(x => x.Name.Contains(keyword));
        }

        var totalItems = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<VenueServiceItem>
        {
            Items = items,
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize
        };
    }
}