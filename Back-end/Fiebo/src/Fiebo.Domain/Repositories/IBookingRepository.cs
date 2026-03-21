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
        Task<List<Booking>> GetBookingListForOwnerAsync(string ownerId, Fiebo.Application.DTOs.Booking.OwnerBookingFilter parameters);
    }
}
