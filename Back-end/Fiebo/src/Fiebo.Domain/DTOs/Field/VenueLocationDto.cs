using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTOs.Field
{
    public class VenueLocationDto
    {
        public int VenueId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }
    }
}
