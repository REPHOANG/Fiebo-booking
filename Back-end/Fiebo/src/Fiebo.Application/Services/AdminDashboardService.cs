using Fiebo.Application.DTOs.AdminDashboard;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICacheService _cacheService;

        public AdminDashboardService(IUnitOfWork unitOfWork, ICacheService cacheService)
        {
            _unitOfWork = unitOfWork;
            _cacheService = cacheService;
        }

        public async Task<AdminDashboardResponse> GetDashboardAsync(DashboardRequest request)
        {
            // Set default date range to last 7 days if not provided
            var currentTo = request.To ?? DateTime.Now;
            var currentFrom = request.From ?? currentTo.AddDays(-7);

            // Validate date range constraints
            if ((currentTo - currentFrom).TotalDays > 365)
            {
                throw new BadRequestException("Quá nhiều dữ liệu để tải. Vui lòng chọn khung thời gian ngắn hơn.");
            }

            currentFrom = currentFrom.Date;
            currentTo = currentTo.Date.AddDays(1).AddTicks(-1);

            var cacheKey = $"admin:dashboard:simple:{currentFrom:yyyyMMdd}:{currentTo:yyyyMMdd}";
            var cachedData = await _cacheService.GetAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<AdminDashboardResponse>(cachedData)!;
            }

            var rawData = await _unitOfWork.AdminDashboard.GetDashboardDataAsync(currentFrom, currentTo);

            var response = new AdminDashboardResponse
            {
                TotalRevenue = new KpiCardDto { Value = rawData.CurrentTotalRevenue },
                TotalBookings = new KpiCardDto { Value = rawData.CurrentTotalBookings },
                NewFieldOwners = new KpiCardDto { Value = rawData.CurrentNewOwners },
                ActiveVenues = new KpiCardDto { Value = rawData.CurrentActiveVenues },
                TotalRegisteredVenues = rawData.TotalRegisteredVenues
            };

            // Chart: Daily Performance
            for (var dt = currentFrom.Date; dt <= currentTo.Date; dt = dt.AddDays(1))
            {
                response.DailyPerformance.Add(new DailyBookingDataPoint
                {
                    Date = dt,
                    BookingCount = rawData.BookingsByDate.GetValueOrDefault(dt, 0),
                    NewUserCount = rawData.NewUsersByDate.GetValueOrDefault(dt, 0)
                });
            }

            // Chart: Plan Distribution
            var totalPlans = rawData.PlanDistribution.Values.Sum();
            foreach (var kvp in rawData.PlanDistribution)
            {
                response.PlanDistribution.Add(new PlanDistributionDto
                {
                    PlanName = kvp.Key,
                    Count = kvp.Value,
                    Percent = totalPlans > 0 ? Math.Round((decimal)kvp.Value / totalPlans * 100, 2) : 0
                });
            }

            // Inventory: Field Distribution
            foreach (var kvp in rawData.FieldDistributionBySportType)
            {
                response.FieldDistribution.Add(new SportTypeDistributionDto
                {
                    SportTypeName = kvp.Key,
                    FieldCount = kvp.Value
                });
            }

            await _cacheService.SetAsync(cacheKey, JsonSerializer.Serialize(response), TimeSpan.FromMinutes(30));

            return response;
        }
    }
}
