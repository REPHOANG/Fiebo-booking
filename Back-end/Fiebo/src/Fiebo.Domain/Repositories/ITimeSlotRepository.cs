using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface ITimeSlotRepository : IRepository<TimeSlot>
    {
        Task<List<TimeSlot>> GetTimeSlotsByVenueAndDateAsync(int venueId, DateOnly date);
        Task<bool> HasTimeSlotsOutsideRangeAsync(int venueId, TimeOnly newOpenTime, TimeOnly newCloseTime);
    }
}
