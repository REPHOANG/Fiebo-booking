using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTOs.Field
{
    public class VenueInfoStat
    {
        public int VenueId { get; set; }

        public string VenueName { get; set; } = null!;

        public string? Province { get; set; }

        public string? Ward { get; set; }

        public string? AddressDetail { get; set; }

        public TimeSpan OpenTime { get; set; }

        public TimeSpan CloseTime { get; set; }

        public double AvgRating { get; set; }

        public string? ThumbnailUrl { get; set; }

        public int BookingCount { get; set; }

        public double Lat { get; set; }

        public double Lng { get; set; }
    }
}
