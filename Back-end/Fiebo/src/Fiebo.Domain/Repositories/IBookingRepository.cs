using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IBookingRepository : IRepository<Booking>
    {
        Task<List<Booking>> GetBookingHistoryByUserIdAsync(string userId);
        Task<Booking?> GetBookingForReportAsync(int bookingId, string userId);
    }
}
