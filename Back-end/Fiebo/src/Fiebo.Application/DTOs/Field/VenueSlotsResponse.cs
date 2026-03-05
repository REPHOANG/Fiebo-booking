using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class VenueSlotsResponse
    {
        public int VenueId { get; set; }

        public DateOnly Date { get; set; }

        public List<SportTypeSlotResponse> SportTypes { get; set; } = [];
    }
}
