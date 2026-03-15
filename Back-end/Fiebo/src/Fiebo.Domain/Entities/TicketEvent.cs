using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class TicketEvent
    {
        public int EventId { get; set; }

        public int FieldId { get; set; }
        public int SlotId { get; set; }

        public string? Description { get; set; }

        public DateOnly EventDate { get; set; }

        public int MinPlayer { get; set; }
        public int MaxPlayer { get; set; }

        public decimal PricePerPerson { get; set; }

        public required string OwnerId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public TicketEventStatus Status { get; set; }

        // Navigation
        public Field Field { get; set; } = null!;
        public TimeSlot Slot { get; set; } = null!;

        public ICollection<TicketParticipant> Participants { get; set; } = [];
    }
}
