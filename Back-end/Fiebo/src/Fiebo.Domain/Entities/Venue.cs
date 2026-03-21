using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Venue : BaseEntity
    {
        public required string Name { get; set; }
        public TimeSpan OpenTime { get; set; }

        public TimeSpan CloseTime { get; set; }

        public string? Description { get; set; }

        public string? AddressDetail { get; set; }
        public string? ThumbnailUrl { get; set; }

        public int ProvinceId { get; set; }

        public int WardId { get; set; }

        public required string OwnerId { get; set; }

        public double Longitude { get; set; }

        public double Latitude { get; set; }

        public VenueStatus Status { get; set; }


        // Navigation
        public Province? Province { get; set; }
        public Ward? Ward { get; set; }
        public ICollection<Field> Fields { get; set; } = [];
        public ICollection<TimeSlot> TimeSlots { get; set; } = [];
        public ICollection<Booking> Bookings { get; set; } = [];
    }
}
