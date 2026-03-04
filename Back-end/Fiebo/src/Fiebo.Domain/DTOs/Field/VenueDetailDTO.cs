using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTOs.Field
{
    public class VenueDetailDTO
    {
        public required string Name { get; set; }
        public TimeSpan OpenTime { get; set; }

        public TimeSpan CloseTime { get; set; }

        public double AverageRating { get; set; } = 0;

        public string? Description { get; set; }

        public string? Province { get; set; }

        public string? Ward { get; set; }

        public string? AddressDetail { get; set; }

        public double Longitude { get; set; }

        public double Latitude { get; set; }
    }
}
