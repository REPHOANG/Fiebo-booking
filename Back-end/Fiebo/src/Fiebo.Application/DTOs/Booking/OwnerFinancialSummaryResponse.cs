using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerFinancialSummaryResponse
    {
        public decimal TotalRevenue { get; set; }
        public int TotalBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public decimal PendingPayoutAmount { get; set; }
        public decimal CurrentWalletBalance { get; set; }

        public List<RevenueTrendItem> RevenueTrends { get; set; } = [];
        public List<FinancialBookingTrendItem> BookingTrends { get; set; } = [];
        public List<VenuePerformanceItem> VenuePerformances { get; set; } = [];
    }

    public class RevenueTrendItem
    {
        public DateOnly Date { get; set; }
        public decimal Revenue { get; set; }
    }

    public class FinancialBookingTrendItem
    {
        public DateOnly Date { get; set; }
        public int TotalCount { get; set; }
        public int CompletedCount { get; set; }
    }

    public class VenuePerformanceItem
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public int BookingCount { get; set; }
        public decimal Revenue { get; set; }
    }
}
