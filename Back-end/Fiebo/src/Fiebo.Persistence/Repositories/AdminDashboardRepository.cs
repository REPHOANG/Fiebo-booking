using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Constants;

namespace Fiebo.Persistence.Repositories
{
    public class AdminDashboardRepository : IAdminDashboardRepository
    {
        private readonly FieboDbContext _context;

        public AdminDashboardRepository(FieboDbContext context)
        {
            _context = context;
        }

        public async Task<AdminDashboardRawData> GetDashboardDataAsync(DateTime currentFrom, DateTime currentTo)
        {
            var data = new AdminDashboardRawData();
            var now = DateTime.Now;
            var thirtyDaysAgo = now.AddDays(-30);

            // 1. Basic Counts & Sums (KPIs) - Optimized with AsNoTracking
            data.CurrentTotalRevenue = await _context.SubscriptionTransactions
                .AsNoTracking()
                .Where(t => t.PaidAt >= currentFrom && t.PaidAt <= currentTo)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            data.CurrentTotalBookings = await _context.Bookings
                .AsNoTracking()
                .Where(b => b.Status == BookingStatus.Completed && b.CreatedAt >= currentFrom && b.CreatedAt <= currentTo)
                .CountAsync();

            data.CurrentNewOwners = await _context.OwnerPlans
                .AsNoTracking()
                .Where(op => op.CreatedAt >= currentFrom && op.CreatedAt <= currentTo)
                .Select(op => op.OwnerId)
                .Distinct()
                .CountAsync();

            // 2. Active Venues (BR-04) - Optimized SQL-side filtering with Any()
            data.CurrentActiveVenues = await _context.Venues
                .AsNoTracking()
                .Where(v => v.Status == VenueStatus.Active && 
                            _context.OwnerPlans.Any(op => op.OwnerId == v.OwnerId && op.EndDate > now) &&
                            _context.Bookings.Any(b => b.VenueId == v.Id && b.Status == BookingStatus.Completed && b.CreatedAt >= thirtyDaysAgo))
                .CountAsync();

            // 3. Time Series Data
            data.BookingsByDate = await _context.Bookings
                .AsNoTracking()
                .Where(b => b.Status == BookingStatus.Completed && b.CreatedAt >= currentFrom && b.CreatedAt <= currentTo)
                .GroupBy(b => b.CreatedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Date, x => x.Count);

            data.NewUsersByDate = await _context.OwnerPlans
                .AsNoTracking()
                .Where(op => op.CreatedAt >= currentFrom && op.CreatedAt <= currentTo)
                .GroupBy(op => op.CreatedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Select(x => x.OwnerId).Distinct().Count() })
                .ToDictionaryAsync(x => x.Date, x => x.Count);

            // 4. Distribution Data
            data.PlanDistribution = await _context.SubscriptionTransactions
                .AsNoTracking()
                .Include(st => st.Plan)
                .Where(t => t.PaidAt >= currentFrom && t.PaidAt <= currentTo)
                .GroupBy(t => t.Plan.Name)
                .Select(g => new { PlanName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PlanName, x => x.Count);

            data.FieldDistributionBySportType = await _context.Fields
                .AsNoTracking()
                .Include(f => f.SportType)
                .Where(f => f.Status == FieldStatus.Active && f.Venue != null && f.Venue.Status == VenueStatus.Active)
                .GroupBy(f => f.SportType!.Name)
                .Select(g => new { SportTypeName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SportTypeName, x => x.Count);

            // 5. Inventory
            data.TotalRegisteredVenues = await _context.Venues
                .AsNoTracking()
                .CountAsync(v => v.Status == VenueStatus.Active);

            return data;
        }
    }
}
