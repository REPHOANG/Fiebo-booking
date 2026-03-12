using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Review
    {
        public int Id { get; set; }

        public string? Comment { get; set; }

        public double Rating { get; set; }

        public string UserId { get; set; } = string.Empty;

        public int BookingId { get; set; }

        public DateTime CreatedAt { get; set; } = Shared.DateTimeHelper.VietnamNow;


        // Navigation
        public Booking? Booking { get; set; }
        public ICollection<ReviewImage> Images { get; set; } = [];
    }
}
