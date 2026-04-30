using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class TicketEventDetailResponse
    {
        public int EventId { get; set; }
        public string Name { get; set; } = string.Empty;

        public string VenueName { get; set; } = null!;
        public string VenueAddress { get; set; } = null!;
        public DateOnly EventDate { get; set; }
        public string? Description { get; set; }
        public decimal TicketPrice { get; set; }
        public int TicketQuantity { get; set; }
        public int RemainingTicketQuantity { get; set; }
        public List<TicketEventSlotResponse> Slots { get; set; } = [];
    }
}
