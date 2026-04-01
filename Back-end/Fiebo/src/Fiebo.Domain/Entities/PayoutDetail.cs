using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class PayoutDetail
    {
        public int Id { get; set; }

        public int PayoutId { get; set; }
        public int BookingId { get; set; }

        public decimal Amount { get; set; }

        // Navigation
        public Payout Payout { get; set; } = null!;
        public Booking Booking { get; set; } = null!;
    }
}
