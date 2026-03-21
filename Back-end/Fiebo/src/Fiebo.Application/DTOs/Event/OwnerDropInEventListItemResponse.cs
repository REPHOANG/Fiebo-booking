using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Event
{
    public class OwnerDropInEventListItemResponse
    {
        public int EventId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public DateOnly EventDate { get; set; }
        public List<TicketEventSlotResponse> Slots { get; set; } = new();
        public decimal TicketPrice { get; set; }
        public int TotalTicketQuantity { get; set; }
        public int RemainingTicketQuantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
