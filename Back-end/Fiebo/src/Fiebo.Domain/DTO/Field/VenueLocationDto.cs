using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTO.Field
{
    public class VenueLocationDto
    {
        public int VenueId { get; set; }

        public double Lat { get; set; }

        public double Lng { get; set; }
    }
}
