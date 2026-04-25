using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class VenueMapResponse
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = null!;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string SportType { get; set; } = null!;
    }
}
