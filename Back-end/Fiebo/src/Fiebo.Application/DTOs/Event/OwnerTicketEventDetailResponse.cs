using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.TicketEvent
{
    public class OwnerTicketEventDetailResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateOnly EventDate { get; set; }
        public int MinPlayer { get; set; }
        public int MaxPlayer { get; set; }
        public decimal PricePerPerson { get; set; }
        public string Status { get; set; } = null!;
        public bool IsEditable { get; set; }
        public List<EventSlotResponse> Slots { get; set; } = [];
        public List<ParticipantResponse> Participants { get; set; } = [];
    }

    public class EventSlotResponse
    {
        public string FieldName { get; set; } = null!;
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
    }

    public class ParticipantResponse
    {
        public string Fullname { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public int TicketQuantity { get; set; }
        public string Status { get; set; } = null!;
        public DateTime JoinedAt { get; set; }
    }
}
