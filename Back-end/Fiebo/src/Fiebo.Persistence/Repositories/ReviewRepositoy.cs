using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Fiebo.Persistence.QuerySort;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class ReviewRepositoy : Repository<Review>, IReviewRepository
    {
        public ReviewRepositoy(FieboDbContext context) : base(context)
        {
        }

        public async Task<int> CountByVenueAsync(int venueId)
        {
            return await _context.Reviews
                .Where(r => r.Booking!.VenueId == venueId).CountAsync();
        }

        public async Task<double> GetAverageByVenueAsync(int venueId)
        {
            return await _context.Reviews
                .Where(r => r.Booking!.VenueId == venueId)
                .AverageAsync(r => (double?)r.Rating) ?? 0;
        }

        public async Task<PagedResult<Review>> GetByVenueAsync(
            int venueId,
            int page,
            int pageSize,
            string? sort)
        {
            var baseQuery = _context.Reviews
                .AsNoTracking()
                .Where(r =>
                    r.Booking!.VenueId == venueId);

            var totalItems = await baseQuery.CountAsync();
            if (!ReviewSortMap.Map.TryGetValue(
                    sort?.ToLower() ?? "",
                    out var order))
            {
                order = q => q.OrderByDescending(x => x.CreatedAt);
            }

            var items = await order(baseQuery)
                .Include(r => r.Images)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Review>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems
            };
        }

        public async Task<Dictionary<int, double>> GetAveragesByVenueAsync(List<int> venueId)
        {
            return await _context.Reviews
                .Where(r => venueId.Contains(r.Booking!.VenueId))
                .GroupBy(r => r.Booking!.VenueId)
                .Select(g => new
                {
                    VenueId = g.Key,
                    Average = g.Average(r => (double?)r.Rating) ?? 0
                })
                .ToDictionaryAsync(x => x.VenueId, x => x.Average);
        }
    }
}
