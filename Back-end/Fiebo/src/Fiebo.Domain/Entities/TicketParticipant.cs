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

        public required string UserId { get; set; }
        public required string Fullname { get; set; }
        public required string PhoneNumber { get; set; }

        public int TicketQuantity{ get; set; }
        public decimal PricePerTicket { get; set; }
        public decimal TotalPrice { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.Now;

        public TicketParticipantStatus Status { get; set; }
        public DateTime? ExpiredAt { get; set; }

        // Navigation
        public TicketEvent Event { get; set; } = null!;
    }
}
