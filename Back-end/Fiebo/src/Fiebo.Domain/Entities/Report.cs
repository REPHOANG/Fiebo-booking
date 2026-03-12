using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Report : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int Status { get; set; } = 0;

        public string? ResponseContent { get; set; }
        public DateTime? RespondedAt { get; set; }
        public string? AdminId { get; set; }

        public int BookingId { get; set; }
        public virtual Booking? Booking { get; set; }

        public string UserId { get; set; } = string.Empty;
    }
}
