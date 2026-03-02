using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class VenueInfoResponse
    {
        public int VenueId { get; set; }

        public string? VenueName { get; set; }

        public string? Province { get; set; }
        public string? Ward { get; set; }
        public string? AddressDetail { get; set; }

        public TimeSpan OpenTime { get; set; }

        public TimeSpan CloseTime { get; set; }

        public double Rating { get; set; }

        public string? ThumbnailUrl { get; set; }

        public double DistanceKm { get; set; }
        public int BookingCount { get; set; }
    }
}
