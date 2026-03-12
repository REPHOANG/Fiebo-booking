using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class BookingRepository : Repository<Booking>, IBookingRepository
    {
        public BookingRepository(FieboDbContext context) : base(context) { }

        public async Task<List<Booking>> GetBookingHistoryByUserIdAsync(string userId)
        {
            return await _context.Bookings
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                        .ThenInclude(f => f.Venue)
                            .ThenInclude(v => v.Province) 
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                        .ThenInclude(f => f.Venue)
                            .ThenInclude(v => v.Ward) 
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        public async Task<Booking?> GetBookingForReportAsync(int bookingId, string userId)
        {
            return await _context.Bookings
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);
        }

        public async Task<Booking?> GetBookingDetailByBookingId(int id)
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                .ThenInclude(d => d.Field)
                .Include(b => b.BookingDetails)
                .ThenInclude(d => d.TimeSlot)
                .FirstOrDefaultAsync(b => b.Id == id);
        }
    }
}
