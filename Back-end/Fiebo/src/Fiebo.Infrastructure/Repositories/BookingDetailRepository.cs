using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Repositories
{
    public class BookingDetailRepository : Repository<BookingDetail>, IBookingDetailRepository
    {
        public BookingDetailRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<Dictionary<int, int>> 
            CountCompletedBookingByFieldsAsync(List<int> fieldIds)
        {
            return await _context.BookingDetails
                .Where(bd =>
                    fieldIds.Contains(bd.FieldId) &&
                    bd.Booking.Status == BookingStatus.Completed)
                .GroupBy(bd => bd.FieldId)
                .Select(g => new
                {
                    FieldId = g.Key,
                    Count = g.Count()
                })
                .ToDictionaryAsync(x => x.FieldId, x => x.Count);
        }

        public async Task<int> CountCompletedBookingByVenueAsync(int venueId)
        {
            return await _context.BookingDetails
           .Where(bd =>
               bd.Field.VenueId == venueId &&
               bd.Booking.Status == BookingStatus.Completed)
           .CountAsync();
        }

        public async Task<Dictionary<int, int>> CountCompletedBookingsByVenueAsync(List<int> venueId)
        {
            return await _context.BookingDetails
                .Where(bd =>
                    venueId.Contains(bd.Field.VenueId) &&
                    bd.Booking.Status == BookingStatus.Completed)
                .GroupBy(bd => bd.Field.VenueId)
                .Select(g => new
                {
                    VenueId = g.Key,
                    Count = g.Count()
                })
                .ToDictionaryAsync(x => x.VenueId, x => x.Count);
        }
    }
}
