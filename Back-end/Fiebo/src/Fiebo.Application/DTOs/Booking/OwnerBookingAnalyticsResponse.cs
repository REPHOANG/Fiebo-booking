using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerBookingAnalyticsResponse
    {
        public int TotalBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public List<BookingTrendItem> BookingTrends { get; set; } = [];
        public List<VenueAnalyticsItem> VenueAnalytics { get; set; } = [];
    }

    public class VenueAnalyticsItem
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public int TotalBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public List<BookingTrendItem> BookingTrends { get; set; } = [];
    }

    public class BookingTrendItem
    {
        public DateOnly Date { get; set; }
        public int Count { get; set; }
    }
}
