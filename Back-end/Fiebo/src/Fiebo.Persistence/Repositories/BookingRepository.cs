using Fiebo.Application.DTOs.Booking;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
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
                        .Include(f => f.Venue)
                            .ThenInclude(v => v!.Province)
                        .Include(f => f.Venue)
                            .ThenInclude(v => v!.Ward)                        
                .Where(b => b.UserId == userId);

            if (parameters.FromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(parameters.FromDate.Value);
                query = query.Where(b => b.BookingDetails.Any(bd => bd.Booking.BookingDate >= fromDateOnly));
            }

            if (parameters.ToDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(parameters.ToDate.Value);
                query = query.Where(b => b.BookingDetails.Any(bd => bd.Booking.BookingDate <= toDateOnly));
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
                .Include(b => b.CancelBooking)
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                .ThenInclude(d => d.Field)
                .Include(b => b.BookingDetails)
                .ThenInclude(d => d.TimeSlot)
                .Include(b => b.BookingServiceItems)
                .ThenInclude(si => si.VenueServiceItem)
                .FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<Booking?> GetBookingDetailForOwnerAsync(int bookingId)
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Include(b => b.BookingServiceItems)
                    .ThenInclude(si => si.VenueServiceItem)
                    .Include(b => b.CancelBooking)
                .FirstOrDefaultAsync(b => b.Id == bookingId);
        }

        public async Task<PagedResult<Booking>> GetBookingListForOwnerAsync(string ownerId, Fiebo.Domain.Shared.OwnerBookingHistoryFilter parameters)
        {
            var page = parameters.PageNumber <= 0 ? 1 : parameters.PageNumber;
            var pageSize = parameters.PageSize <= 0 ? 10 : parameters.PageSize;

            var query = _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                .Where(b => b.Venue.OwnerId == ownerId);

            if (parameters.BookingId.HasValue)
            {
                query = query.Where(b => b.Id == parameters.BookingId.Value);
            }

            if (parameters.VenueId.HasValue)
            {
                query = query.Where(b => b.VenueId == parameters.VenueId.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.VenueName))
            {
                query = query.Where(b => b.Venue.Name.Contains(parameters.VenueName));
            }

            if (!string.IsNullOrWhiteSpace(parameters.FieldName))
            {
                query = query.Where(b => b.BookingDetails.Any(bd => bd.Field.Name.Contains(parameters.FieldName)));
            }

            if (parameters.FromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(parameters.FromDate.Value);
                query = query.Where(b => b.BookingDate >= fromDateOnly);
            }

            if (parameters.ToDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(parameters.ToDate.Value);
                query = query.Where(b => b.BookingDate <= toDateOnly);
            }

            if (parameters.Status.HasValue)
            {
                query = query.Where(b => b.Status == parameters.Status.Value);
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
        public async Task<List<Booking>>    GetBookingAnalyticsAsync(string ownerId, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Where(b => b.Venue.OwnerId == ownerId);

            if (fromDate.HasValue)
            {
                query = query.Where(b => b.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(b => b.CreatedAt <= toDate.Value);
            }

            return await query.ToListAsync();
        }
        public async Task<List<Booking>> GetFinancialSummaryDataAsync(string ownerId, DateTime fromDate, DateTime toDate)
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Where(b => b.Venue.OwnerId == ownerId && b.CreatedAt >= fromDate && b.CreatedAt <= toDate)
                .ToListAsync();
        }

        public IQueryable<Booking> GetOwnerDashboardQuery(string ownerId, DateOnly fromDate, DateOnly toDate, int? venueId)
        {
            var fromDateTime = fromDate.ToDateTime(TimeOnly.MinValue);
            var toDateTime = toDate.ToDateTime(TimeOnly.MaxValue);

            var query = _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Include(b => b.CancelBooking)
                .Where(b => b.Venue.OwnerId == ownerId && b.CreatedAt >= fromDateTime && b.CreatedAt <= toDateTime);

            if (venueId.HasValue)
            {
                query = query.Where(b => b.VenueId == venueId.Value);
            }

            return query;
        }

        public async Task<List<int>> GetRatedBookingIdsAsync(List<int> bookingIds)
        {
            return await _context.Reviews
                .Where(r => bookingIds.Contains(r.BookingId))
                .Select(r => r.BookingId)
                .ToListAsync();
        }

        public async Task<PagedResult<Booking>> GetBookingsByStaffIdAsync(List<int> venueIds, OwnerBookingHistoryFilter parameters)
        {
            var page = parameters.PageNumber <= 0 ? 1 : parameters.PageNumber;
            var pageSize = parameters.PageSize <= 0 ? 10 : parameters.PageSize;

            var query = _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Field)
                .Where(b => b.Status != BookingStatus.Holding && venueIds.Contains(b.Venue.Id));

            if (parameters.BookingId.HasValue)
            {
                query = query.Where(b => b.Id == parameters.BookingId.Value);
            }

            if (parameters.VenueId.HasValue)
            {
                query = query.Where(b => b.VenueId == parameters.VenueId.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.VenueName))
            {
                query = query.Where(b => b.Venue.Name.Contains(parameters.VenueName));
            }

            if (!string.IsNullOrWhiteSpace(parameters.FieldName))
            {
                query = query.Where(b => b.BookingDetails.Any(bd => bd.Field.Name.Contains(parameters.FieldName)));
            }

            if (parameters.FromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(parameters.FromDate.Value);
                query = query.Where(b => b.BookingDate >= fromDateOnly);
            }

            if (parameters.ToDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(parameters.ToDate.Value);
                query = query.Where(b => b.BookingDate <= toDateOnly);
            }

            if (parameters.Status.HasValue)
            {
                query = query.Where(b => b.Status == parameters.Status.Value);
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
    }
}
