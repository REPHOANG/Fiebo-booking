using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Field : BaseEntity
    {
        public required string Name { get; set; }

        public string? Description { get; set; }

        public int SportTypeId { get; set; }

        public int VenueId { get; set; }

        public FieldStatus Status { get; set; }


        // Navigation
        public SportType? SportType { get; set; }

        public Venue? Venue { get; set; }

        public ICollection<FieldImage> Images { get; set; } = [];

        public ICollection<TimeSlot> TimeSlots { get; set; } = [];
        public ICollection<BookingDetail> BookingDetails { get; set; } = [];
    }
}
