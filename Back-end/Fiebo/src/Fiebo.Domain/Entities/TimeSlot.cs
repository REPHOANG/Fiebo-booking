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

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public int FieldId { get; set; }

        public decimal Price { get; set; }

        // Navigation
        public Field Field { get; set; } = null!;

        public ICollection<BookingDetail> BookingDetails { get; set; } = [];
    }
}
