using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories
{
    public class FieldRepository : Repository<Field>, IFieldRepository
    {
        public FieldRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<PagedResult<Field>> GetFieldsByVenue(int venueId, int page, int pageSize)
        {
            var baseQuery = _context.Fields
                .AsNoTracking()
                .Where(f =>
                    f.VenueId == venueId &&
                    f.Status == FieldStatus.Active);

            var totalItems = await baseQuery.CountAsync();
            var fields = await baseQuery
                .Include(f => f.SportType)
                .Include(f => f.Images)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return new PagedResult<Field>
            {
                Items = fields,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems
            };
        }

        public async Task<List<SportType>> GetSportTypesByVenueAsync(int venueId)
        {
            return await _context.Fields
                .AsNoTracking()
                .Where(f => f.VenueId == venueId)
                .GroupBy(f => new
                {
                    f.SportTypeId,
                    f.SportType!.Name
                })
                .Select(g => new SportType
                {
                    Id = g.Key.SportTypeId,
                    Name = g.Key.Name
                })
                .ToListAsync();
        }

        public async Task<List<Field>> GetFieldsWithBookingsAsync(int venueId, DateOnly date)
        {
            return await _context.Fields
                .AsNoTracking()
                .Where(f => f.VenueId == venueId)
                .Include(f => f.BookingDetails
                    .Where(bd =>
                        bd.Booking.BookingDate == date &&
                        (bd.Booking.Status == BookingStatus.Pending || bd.Booking.Status == BookingStatus.Booked)))
                .ThenInclude(bd => bd.Booking)
                .ToListAsync();
        }
    }
}
