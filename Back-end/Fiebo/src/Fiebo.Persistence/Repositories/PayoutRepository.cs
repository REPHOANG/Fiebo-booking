using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class PayoutRepository : Repository<Payout>, IPayoutRepository
    {
        public PayoutRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<PagedResult<Payout>> GetOwnerPayouts(string ownerId, int page, int pageSize)
        {
            var query = _context.Payouts
                .Where(p => p.OwnerId == ownerId);
            var totalItems = await query.CountAsync();
            var items = await query
                .Include(p => p.Batch)
                .OrderByDescending(t => t.Batch.FromDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return new PagedResult<Payout>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems
            };
        }
        public async Task<decimal> GetPendingPayoutAmountAsync(string ownerId)
        {
            return await _context.Payouts
                .Where(p => p.Status == PayoutStatus.Pending)
                .Where(p => p.PayoutDetails.Any(pd => pd.Booking.Venue.OwnerId == ownerId))
                .SumAsync(p => p.Amount);
        }
    }
}
