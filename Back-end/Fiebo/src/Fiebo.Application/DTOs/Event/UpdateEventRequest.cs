using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class UpdateEventRequest
    {
        public decimal PricePerPerson { get; set; }

        public int MinPlayer { get; set; }

        public int MaxPlayer { get; set; }

        public string? Description { get; set; }
    }
}
