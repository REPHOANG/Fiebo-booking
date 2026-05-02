using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerBookingListResponse
    {
        public int BookingId { get; set; }
        public string CustomerName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public DateOnly BookingDate { get; set; }
        public string VenueName { get; set; } = null!;
        public string Province { get; set; } = string.Empty;
        public string Ward { get; set; } = string.Empty;
        public decimal TotalPrice { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
}
