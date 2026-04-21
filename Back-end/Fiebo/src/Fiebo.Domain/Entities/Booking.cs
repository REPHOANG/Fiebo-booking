using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Booking : BaseEntity
    {
        public required string UserId { get; set; }
        public required string Fullname { get; set; }
        public required string PhoneNumber { get; set; }
        public DateOnly BookingDate { get; set; }

        public string? BookingNote { get; set; }
        public int VenueId { get; set; }
        public BookingType BookingType { get; set; }
        public decimal TotalPrice { get; set; }
        public BookingStatus Status { get; set; }
        public DateTime? ExpiredAt { get; set; }
        public Venue Venue { get; set; } = null!;
        public ICollection<BookingDetail> BookingDetails { get; set; } = [];
        public ICollection<Review> Reviews { get; set; } = [];
        public ICollection<BookingServiceItem> BookingServiceItems { get; set; } = [];
        public PayoutDetail? PayoutDetail { get; set; }
        public CancelBooking? CancelBooking { get; set; }
    }
}
