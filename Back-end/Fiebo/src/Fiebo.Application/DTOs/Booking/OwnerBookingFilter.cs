using Fiebo.Domain.Enums;
using System;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerBookingFilter
    {
        public int? BookingId { get; set; }
        public int? VenueId { get; set; }
        public string? VenueName { get; set; }
        public string? FieldName { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public BookingStatus? Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
