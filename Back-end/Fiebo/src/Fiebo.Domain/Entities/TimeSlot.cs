using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class TimeSlot
    {
        public int Id { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public int VenueId { get; set; }

        public int SportTypeId { get; set; }

        public decimal Price { get; set; }
        public bool IsDeleted { get; set; } = false;

        // Navigation
        public Venue Venue { get; set; } = null!;

        public ICollection<BookingDetail> BookingDetails { get; set; } = [];

        public SportType? SportType { get; set; }
    }
}
