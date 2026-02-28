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
        public TimeSpan OpenTime { get; set; }

        public TimeSpan CloseTime { get; set; }

        public string? Description { get; set; }

        public string? AddressDetail { get; set; }

        public int ProvinceId { get; set; }

        public int WardId { get; set; }

        public required string OwnerId { get; set; }

        public decimal Longitude { get; set; }

        public decimal Latitude { get; set; }

        public VenueStatus Status { get; set; }


        // Navigation
        public Province? Province { get; set; }

        public Ward? Ward { get; set; }


        public ICollection<Field>? Fields { get; set; }
    }
}
