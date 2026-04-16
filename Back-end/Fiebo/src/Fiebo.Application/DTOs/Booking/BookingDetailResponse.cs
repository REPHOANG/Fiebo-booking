using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class BookingDetailResponse
    {
        public int BookingId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string? BookingNote { get; set; }

        public string Status { get; set; }

        public DateTime? ExpiredAt { get; set; }

        public int VenueId { get; set; }

        public string VenueName { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public decimal TotalPrice { get; set; }
        public string? CancelReason { get; set; }

        public List<BookingSlotResponse> Details { get; set; } = [];
    }
}
