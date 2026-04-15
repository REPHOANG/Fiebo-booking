using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Event
{
    public class CustomerEventHistoryResponse
    {
        public int TicketParticipantId { get; set; }
        public int EventId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string VenueName { get; set; } = string.Empty;
        public DateOnly EventDate { get; set; }
        public int TicketQuantity { get; set; }
        public decimal TotalAmount { get; set; }
        public string ParticipantStatus { get; set; } = string.Empty;
        public string EventStatus { get; set; } = string.Empty;
        public List<TicketEventSlotResponse> Slots { get; set; } = new();
    }
}