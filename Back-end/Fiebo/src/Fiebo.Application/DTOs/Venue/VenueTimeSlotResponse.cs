using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class VenueTimeSlotResponse
    {
        public int Id { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public required string DayOfWeek { get; set; }
        public decimal Price { get; set; }
    }
}
