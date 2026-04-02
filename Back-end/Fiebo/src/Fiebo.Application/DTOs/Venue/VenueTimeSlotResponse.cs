using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class VenueTimeSlotResponse
    {
        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }
        public List<VenueTimeSlotDto> TimeSlots { get; set; } = [];
    }
}
