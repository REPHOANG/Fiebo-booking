using System;

namespace Fiebo.Application.DTOs.AdminDashboard
{
    public class DashboardRequest
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
    }

    public class KpiCardDto
    {
        public decimal Value { get; set; }
    }

    public class DailyBookingDataPoint
    {
        public DateTime Date { get; set; }
        public int BookingCount { get; set; }
        public int NewUserCount { get; set; }
    }

    public class PlanDistributionDto
    {
        public string PlanName { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percent { get; set; }
    }

    public class SportTypeDistributionDto
    {
        public string SportTypeName { get; set; } = string.Empty;
        public int FieldCount { get; set; }
    }

    public class AdminDashboardResponse
    {
        // KPI Cards
        public KpiCardDto TotalRevenue { get; set; } = new();
        public KpiCardDto TotalBookings { get; set; } = new();
        public KpiCardDto NewFieldOwners { get; set; } = new();
        public KpiCardDto ActiveVenues { get; set; } = new();

        // Charts
        public List<DailyBookingDataPoint> DailyPerformance { get; set; } = new();
        public List<PlanDistributionDto> PlanDistribution { get; set; } = new();

        // Inventory
        public int TotalRegisteredVenues { get; set; }
        public List<SportTypeDistributionDto> FieldDistribution { get; set; } = new();
    }
}
