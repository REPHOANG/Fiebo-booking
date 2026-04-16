using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class BookingHistoryResponse
    {
        public int BookingId { get; set; }
        public string Status { get; set; }
        public DateOnly BookingDate { get; set; }
        public string VenueName { get; set; }   
        public string Address { get; set; }
        public string Province { get; set; }
        public int VenueId { get; set; }
        public string Ward { get; set; }
    }
}