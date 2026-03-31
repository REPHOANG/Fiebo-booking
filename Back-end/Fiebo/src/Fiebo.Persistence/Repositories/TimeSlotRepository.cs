using Fiebo.Domain.Entities;
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
                    s.DayOfWeek == dayOfWeek)
                .ToListAsync();
        }

        public async Task<bool> HasTimeSlotsOutsideRangeAsync(
            int venueId, TimeOnly newOpenTime, TimeOnly newCloseTime)
        {
            return await _context.TimeSlots
                .AnyAsync(ts => ts.VenueId == venueId
                             && (ts.StartTime < newOpenTime || ts.EndTime > newCloseTime));
        }
    }
}
