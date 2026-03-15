using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class TicketParticipant
    {
        public int ParticipantId { get; set; }

        public int EventId { get; set; }

        public int UserId { get; set; }

        public int TicketAmount { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.Now;

        public TicketParticipantStatus Status { get; set; }

        // Navigation
        public TicketEvent Event { get; set; } = null!;
    }
}
