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
        public decimal TotalPrice { get; set; }
        public string Status { get; set; }
        public DateTime BookingDate { get; set; }
        public string VenueName { get; set; }
        public string FieldName { get; set; }
        public string Address { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public DateOnly PlayDate { get; set; }
    }
}
