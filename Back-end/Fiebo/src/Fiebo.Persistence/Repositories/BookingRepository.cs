using Fiebo.Application.DTOs.Booking;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
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

        public async Task<PagedResult<Booking>> GetBookingHistoryByUserIdAsync(string userId, BookingHistory parameters)
        {
            var page = parameters.PageNumber <= 0 ? 1 : parameters.PageNumber;
            var pageSize = parameters.PageSize <= 0 ? 10 : parameters.PageSize;

            var query = _context.Bookings
                .AsNoTracking()
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                        .ThenInclude(f => f.Venue)
                            .ThenInclude(v => v.Province)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                        .ThenInclude(f => f.Venue)
                            .ThenInclude(v => v.Ward)
                .Where(b => b.UserId == userId);

            if (parameters.FromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(parameters.FromDate.Value);
                query = query.Where(b => b.BookingDetails.Any(bd => bd.BookingDate >= fromDateOnly));
            }

            if (parameters.ToDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(parameters.ToDate.Value);
                query = query.Where(b => b.BookingDetails.Any(bd => bd.BookingDate <= toDateOnly));
            }

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(b => b.CreatedAt) 
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Booking>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
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

        public async Task<Booking?> GetBookingDetailForOwnerAsync(int bookingId, string ownerId)
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.Venue.OwnerId == ownerId);
        }
    }
}
