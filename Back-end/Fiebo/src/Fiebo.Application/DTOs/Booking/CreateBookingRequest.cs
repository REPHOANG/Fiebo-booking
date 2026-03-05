using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class CreateBookingRequest
    {
        public DateOnly BookingDate { get; set; }

        public required string Fullname { get; set; }

        public required string PhoneNumber { get; set; }

        public string? BookingNote { get; set; }

        public List<CreateBookingDetailRequest> Details { get; set; } = [];
    }
}
