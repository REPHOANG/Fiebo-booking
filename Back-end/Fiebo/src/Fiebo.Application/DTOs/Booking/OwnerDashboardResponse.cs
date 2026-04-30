using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerDashboardResponse
    {
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int? VenueId { get; set; }

        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public double BookingChangePercent { get; set; }
        public double RevenueChangePercent { get; set; }
        public double CompletionRate { get; set; }
        public double CancellationRate { get; set; }

        public OwnerDashboardPeakTimeItem? PeakTime { get; set; }

        public OwnerDashboardChartData RevenueTrend { get; set; } = new();
        public OwnerDashboardChartData BookingTrend { get; set; } = new();
        public OwnerDashboardChartData Distribution { get; set; } = new();
    }

    public class OwnerDashboardPeakTimeItem
    {
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public int BookingCount { get; set; }
    }

    public class OwnerDashboardChartData
    {
        public List<string> Labels { get; set; } = [];
        public List<OwnerDashboardChartDataset> Datasets { get; set; } = [];
    }

    public class OwnerDashboardChartDataset
    {
        public string Label { get; set; } = string.Empty;
        public List<decimal> Data { get; set; } = [];
    }
}
