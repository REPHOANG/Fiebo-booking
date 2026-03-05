using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class BookingDetail
    {
        public int Id { get; set; }
        public int BookingId { get; set; }
        public DateOnly BookingDate { get; set; }
        public int FieldId { get; set; }
        public int SlotId { get; set; }
        public decimal Price { get; set; }

        // Navigation Properties
        public Booking Booking { get; set; } = null!;
        public Field Field { get; set; } = null!;
        public TimeSlot? TimeSlot { get; set; }
        public ICollection<Review> Reviews { get; set; } = null!;
    }
}
