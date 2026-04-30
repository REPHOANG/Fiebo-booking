using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerBookingDetailResponse
    {
        public int BookingId { get; set; }
        public string CustomerName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? BookingNote { get; set; }
        public decimal TotalPrice { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CancelReason { get; set; }

        public List<DetailItemResponse> BookedItems { get; set; } = [];
        public List<BookingServiceItemResponse> Services { get; set; } = [];
    }

    public class DetailItemResponse
    {
        public string FieldName { get; set; } = null!;
        public DateOnly PlayDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public decimal Price { get; set; }
    }
}
