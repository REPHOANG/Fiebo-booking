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
    public class TimeSlotRepository : Repository<TimeSlot>, ITimeSlotRepository
    {
        public TimeSlotRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<TimeSlot>> GetTimeSlotsByVenueAndDateAsync(int venueId, DateOnly date)
        {
            var dayOfWeek = date.DayOfWeek;

            return await _context.TimeSlots
                .AsNoTracking()
                .Where(s =>
                    s.VenueId == venueId &&
                    s.DayOfWeek == dayOfWeek &&
                    s.IsDeleted == false)
                .ToListAsync();
        }

        public async Task<bool> HasTimeSlotsOutsideRangeAsync(
            int venueId, TimeOnly newOpenTime, TimeOnly newCloseTime)
        {
            return await _context.TimeSlots
                .AnyAsync(ts => ts.VenueId == venueId
                             && (ts.StartTime < newOpenTime || ts.EndTime > newCloseTime));
        }

        public Task<List<TimeSlot>> GetVenueTimeSlotAsync(int venueId, int sportTypeId)
        {
            return _context.TimeSlots
                .AsNoTracking()
                .Where(s =>
                    s.VenueId == venueId &&
                    s.SportTypeId == sportTypeId &&
                    s.IsDeleted == false)
                .OrderBy(s => s.DayOfWeek)
                .ThenBy(s => s.StartTime)
                .ToListAsync();
        }

        public async Task<bool> IsTimeSlotOverlapping(
            int venueId,
            int sportTypeId,
            DayOfWeek dayOfWeek,
            TimeOnly startTime,
            TimeOnly endTime,
            int? excludeId = null)
        {
            return await _context.TimeSlots
                .Where(x =>
                    !x.IsDeleted &&
                    x.VenueId == venueId &&
                    x.SportTypeId == sportTypeId &&
                    x.DayOfWeek == dayOfWeek &&
                    (excludeId == null || x.Id != excludeId)
                )
                .AnyAsync(x =>
                    startTime < x.EndTime &&
                    endTime > x.StartTime
                );
        }
        public async Task<bool> CanBeEditedOrDeleted(int sloId)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var booking = await _context.BookingDetails
                .AnyAsync(bd => bd.SlotId == sloId && bd.Booking.BookingDate >= today 
                && (bd.Booking.Status == BookingStatus.Booked || bd.Booking.Status == BookingStatus.Pending));
            var eventUsed = await _context.TicketEventDetails
                .AnyAsync(d => d.SlotId == sloId && d.Event.EventDate >= today && d.Event.Status == TicketEventStatus.Pending);
            return !booking || !eventUsed;
        }
    }
}
