using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class CancelBooking
    {
        public int Id { get; set; }
        public int BookingId { get; set; }
        public string? CancelReason { get; set; }
        public decimal RefundAmount { get; set; }
        public Booking Booking { get; set; } = null!;
    }
}
