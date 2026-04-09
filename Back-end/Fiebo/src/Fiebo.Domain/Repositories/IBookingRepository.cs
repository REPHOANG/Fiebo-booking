using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IBookingRepository : IRepository<Booking>
    {
        Task<PagedResult<Booking>> GetBookingHistoryByUserIdAsync(string userId, BookingHistory parameters);
        Task<Booking?> GetBookingForReportAsync(int bookingId, string userId);
        Task<Booking?> GetBookingDetailByBookingId(int id);
        Task<Booking?> GetBookingDetailForOwnerAsync(int bookingId, string ownerId);
        Task<PagedResult<Booking>> GetBookingListForOwnerAsync(string ownerId, Fiebo.Domain.Shared.OwnerBookingHistoryFilter parameters);
        Task<List<Booking>> GetBookingAnalyticsAsync(string ownerId, DateTime? fromDate, DateTime? toDate);
        Task<List<Booking>> GetFinancialSummaryDataAsync(string ownerId, DateTime fromDate, DateTime toDate);
        IQueryable<Booking> GetOwnerDashboardQuery(string ownerId, DateOnly fromDate, DateOnly toDate, int? venueId);
    }
}
