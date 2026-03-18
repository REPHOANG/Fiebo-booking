using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class TicketDetailResponse
    {
        public int ParticipantId { get; set; }        
        public string Fullname { get; set; } = null!; 
        public string PhoneNumber { get; set; } = null!;

        public DateOnly EventDate { get; set; }
        public List<TicketEventSlotResponse> Slots { get; set; } = [];

        public int TicketQuantity { get; set; } 
        public decimal PricePerTicket { get; set; }
        public decimal TotalAmount { get; set; } 
        public DateTime? ExpiredAt { get; set; }
        public string Status { get; set; } = null!;
    }
}
