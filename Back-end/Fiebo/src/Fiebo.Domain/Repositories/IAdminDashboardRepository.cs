using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public class AdminDashboardRawData
    {
        // Current Period Aggregations
        public decimal CurrentTotalRevenue { get; set; }
        public int CurrentTotalBookings { get; set; }
        public int CurrentNewOwners { get; set; }
        public int CurrentActiveVenues { get; set; }

        // Time Series Data
        public Dictionary<DateTime, int> BookingsByDate { get; set; } = new();
        public Dictionary<DateTime, int> NewUsersByDate { get; set; } = new();

        // Distribution Data
        public Dictionary<string, int> PlanDistribution { get; set; } = new();
        public Dictionary<string, int> FieldDistributionBySportType { get; set; } = new();

        // Inventory
        public int TotalRegisteredVenues { get; set; }
    }

    public interface IAdminDashboardRepository
    {
        Task<AdminDashboardRawData> GetDashboardDataAsync(DateTime currentFrom, DateTime currentTo);
    }
}
