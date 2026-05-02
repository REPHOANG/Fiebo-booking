using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
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

        public async Task<bool> IsSlotAvailable(int slotId, int fieldId, DateOnly bookingDate)
        {
            return !await _context.BookingDetails
                .AnyAsync(bd =>
                    bd.SlotId == slotId &&
                    bd.FieldId == fieldId &&
                    bd.Booking.BookingDate == bookingDate &&
                    (bd.Booking.Status == BookingStatus.Pending || bd.Booking.Status == BookingStatus.Booked));
        }

        public async Task AddBookingDetailsAsync(IEnumerable<BookingDetail> details)
        {
            await _context.BookingDetails.AddRangeAsync(details);
        }

        public async Task<BookingDetail?> GetEarliestDetailAsync(int bookingId)
        {
            return await _context.BookingDetails
                .Include(d => d.TimeSlot)
                .Where(d => d.BookingId == bookingId)
                .OrderBy(d => d.TimeSlot!.StartTime)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> HasUpcomingBookingsForFieldAsync(int fieldId)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            return await _context.BookingDetails
                .AnyAsync(bd =>
                    bd.FieldId == fieldId &&
                    bd.Booking.BookingDate >= today &&
                    (bd.Booking.Status == BookingStatus.Pending || bd.Booking.Status == BookingStatus.Booked));
        }

        public async Task<bool> HasUpcomingBookingsForVenueAsync(int venueId)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);

            return await _context.Bookings
                .AnyAsync(b =>
                    b.VenueId == venueId &&
                    b.BookingDate >= today &&
                    (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Booked));
        }

        public async Task<List<(int SlotId, int FieldId)>> GetUnavailableSlots(
            List<(int SlotId, int FieldId)> requestedSlots,
            DateOnly bookingDate)
        {
            var slotIds = requestedSlots.Select(x => x.SlotId).Distinct().ToList();
            var fieldIds = requestedSlots.Select(x => x.FieldId).Distinct().ToList();

            var queryResults = await _context.BookingDetails
                .AsNoTracking()
                .Where(bd =>
                    slotIds.Contains(bd.SlotId) &&
                    fieldIds.Contains(bd.FieldId) &&
                    bd.Booking.BookingDate == bookingDate &&
                    (bd.Booking.Status == BookingStatus.Booked 
                    || bd.Booking.Status == BookingStatus.Pending 
                    || bd.Booking.Status == BookingStatus.Holding
                    || bd.Booking.Status == BookingStatus.Completed)
                )
                .Select(bd => new { bd.SlotId, bd.FieldId })
                .Distinct()
                .ToListAsync();

            return queryResults
                .Where(qr => requestedSlots.Any(rs => rs.SlotId == qr.SlotId && rs.FieldId == qr.FieldId))
                .Select(qr => (qr.SlotId, qr.FieldId))
                .ToList();
        }
    }
}
