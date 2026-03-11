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
        public BookingRepository(FieboDbContext context) : base(context)
        {
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
