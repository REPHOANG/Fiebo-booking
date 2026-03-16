using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class JoinEventRequest
    {
        [Required]
        public required string Fullname { get; set; }
        [Required]
        [Phone]
        public required string PhoneNumber { get; set; }
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Ticket quantity must be at least 1")]
        public int TicketQuantity { get; set; }
    }
}
