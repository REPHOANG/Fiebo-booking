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

        public string VenueName { get; set; } = null!;
        public string VenueAddress { get; set; } = null!;

        public string FieldName { get; set; } = null!;

        public DateOnly EventDate { get; set; }

        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public decimal TicketPrice { get; set; }

        public int TicketQuantity { get; set; }

        public int RemainingTicketQuantity { get; set; }
    }
}
