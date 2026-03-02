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

        public float Rating { get; set; }

        public string UserId { get; set; } = string.Empty;

        public int BookingDetailId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


        // Navigation

        public BookingDetail BookingDetail { get; set; } = null!;
    }
}
