using Fiebo.Domain.Enums;

namespace Fiebo.Application.DTOs.Booking
{
    internal sealed class OwnerDashboardBookingRow
    {
        public int BookingId { get; set; }
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public BookingStatus Status { get; set; }
        public decimal TotalPrice { get; set; }
        public List<OwnerDashboardSlotRow> Slots { get; set; } = [];
    }

    internal sealed class OwnerDashboardSlotRow
    {
        public int SlotId { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
    }

    internal sealed class OwnerDashboardBookingSummaryRow
    {
        public int BookingId { get; set; }
        public BookingStatus Status { get; set; }
        public decimal TotalPrice { get; set; }
    }

    internal sealed class OwnerDashboardMetrics
    {
        public int CurrentBookings { get; set; }
        public int PreviousBookings { get; set; }
        public decimal CurrentRevenue { get; set; }
        public decimal PreviousRevenue { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
    }

    internal sealed class OwnerDashboardEventSummary
    {
        public int BookingCount { get; set; }
        public decimal Revenue { get; set; }
    }

    internal sealed class OwnerDashboardEventParticipantRow
    {
        public int EventId { get; set; }
        public DateTime JoinedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string? VenueName { get; set; }
    }

    internal sealed class OwnerDashboardTrendData
    {
        public List<string> Labels { get; set; } = [];
        public List<decimal> RevenueData { get; set; } = [];
        public List<decimal> BookingData { get; set; } = [];
    }

    internal sealed class OwnerDashboardTrendPoint
    {
        public decimal BookingCount { get; set; }
        public decimal Revenue { get; set; }
    }

    internal sealed class OwnerDashboardDistributionRow
    {
        public string VenueName { get; set; } = string.Empty;
        public int BookingCount { get; set; }
        public decimal Revenue { get; set; }
    }

    internal sealed class OwnerDashboardPeakSlotRow
    {
        public int SlotId { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public int BookingCount { get; set; }
    }
}
