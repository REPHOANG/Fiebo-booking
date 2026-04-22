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

        public async Task<PagedResult<Payout>> GetOwnerPayouts(string ownerId, int page, int pageSize, int? year, int? month)
        {
            var query = _context.Payouts
                .Include(p => p.Batch)
                .Where(p => p.OwnerId == ownerId);

            if (year.HasValue)
            {
                query = query.Where(p => p.Batch.FromDate.Year == year.Value);
                if (month.HasValue)
                {
                    query = query.Where(p => p.Batch.FromDate.Month == month.Value);
                }
            }

            var totalItems = await query.CountAsync();
            var items = await query
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
                .Where(p => p.PayoutDetails.Any(pd => pd.Payout.OwnerId == ownerId))
                .SumAsync(p => p.Amount);
        }
 
        public async Task<Payout?> GetPayoutWithDetailsAsync(int payoutId)
        {
            return await _context.Payouts
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.Batch)
                .Include(p => p.PayoutDetails)
                    .ThenInclude(pd => pd.Booking)
                        .ThenInclude(b => b.Venue)
                .Include(p => p.PayoutDetails)
                    .ThenInclude(pd => pd.Booking)
                        .ThenInclude(b => b.BookingDetails)
                            .ThenInclude(bd => bd.Field)
                            .Include(p => p.PayoutDetails)
                    .ThenInclude(pd => pd.Event)
                        .ThenInclude(b => b.Details)
                            .ThenInclude(bd => bd.Field)
                .FirstOrDefaultAsync(p => p.Id == payoutId);
        }

        public async Task<PagedResult<Payout>> GetAdminPayoutsAsync(int page, int pageSize, PayoutStatus? status, int? year, int? month)
        {
            var query = _context.Payouts
                .AsNoTracking()
                .Include(p => p.Batch)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(p => p.Status == status.Value);

            if (year.HasValue)
            {
                query = query.Where(p => p.Batch.FromDate.Year == year.Value);
                if (month.HasValue)
                    query = query.Where(p => p.Batch.FromDate.Month == month.Value);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.Batch.FromDate)
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

        public async Task<bool> MarkPayoutAsCompletedAsync(int payoutId, string processedBy)
        {
            var payout = await _context.Payouts.FindAsync(payoutId);

            if (payout == null)
                return false;

            if (payout.Status == PayoutStatus.Completed)
                return false;

            payout.Status = PayoutStatus.Completed;
            payout.ProcessedBy = processedBy;
            payout.ProcessedAt = DateTime.UtcNow;
            payout.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<PagedResult<PayoutResponse>> GetPayoutsByBatchIdAsync(
    int batchId,
    int page,
    int pageSize,
    string? name,
    PayoutStatus? status)
        {
            var query = from p in _context.Payouts
                        join b in _context.PayoutBatches on p.BatchId equals b.Id
                        join u in _context.Users on p.OwnerId equals u.Id
                        where p.BatchId == batchId
                        select new { p, b, u };

            if (!string.IsNullOrWhiteSpace(name))
            {
                query = query.Where(x => EF.Functions.Like(x.u.UserName, $"%{name}%"));
            }

            if (status.HasValue)
            {
                query = query.Where(x => x.p.Status == status.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new PayoutResponse
                {
                    Id = x.p.Id,

                    OwnerId = x.p.OwnerId,
                    OwnerName = x.u.FullName,

                    Amount = x.p.Amount,
                    Status = x.p.Status.ToString(),
                    FailureReason = x.p.FailureReason,

                    ProcessedBy = x.p.ProcessedBy,
                    ProcessedAt = x.p.ProcessedAt
                })
                .ToListAsync();

            return new PagedResult<PayoutResponse>
            {
                Items = items,
                TotalItems = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }
    }
}
