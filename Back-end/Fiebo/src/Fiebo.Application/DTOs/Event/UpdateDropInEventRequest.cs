using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class UpdateDropInEventRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int MinPlayer { get; set; }
        public int MaxPlayer { get; set; }
        public decimal PricePerPerson { get; set; }
    }
}