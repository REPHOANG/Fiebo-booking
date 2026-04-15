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
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public DateOnly EventDate { get; set; }

        public int MinPlayer { get; set; }
        public int MaxPlayer { get; set; }

        public decimal PricePerPerson { get; set; }

        public required string OwnerId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public TicketEventStatus Status { get; set; }

        // Navigation
        public ICollection<TicketEventDetail> Details { get; set; } = [];
        public ICollection<TicketParticipant> Participants { get; set; } = [];
    }
}
