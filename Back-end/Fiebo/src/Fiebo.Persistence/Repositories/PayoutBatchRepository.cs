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
    public class PayoutBatchRepository : Repository<PayoutBatch>, IPayoutBatchRepository
    {
        public PayoutBatchRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<PagedResult<PayoutBatch>> GetPayoutBatchesAsync(int page, int pageSize, int? year, int? month, PayoutStatus? status)
        {
            var query = _context.PayoutBatches.AsQueryable();
            if (year.HasValue)
            {
                query = query.Where(p => p.FromDate.Year == year.Value);
                if (month.HasValue)
                {
                    query = query.Where(p => p.FromDate.Month == month.Value);
                }
            }
            if (status != null)
            {
                query = query.Where(p => p.Status == status);
            }
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).OrderByDescending(p => p.CreatedAt).ToListAsync();
            return new PagedResult<PayoutBatch>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = await query.CountAsync(),
                Items = items
            };
        }
        public async Task<bool> StartProcessingBatchAsync(int batchId, string processedBy)
        {
            var batch = await _context.PayoutBatches.FindAsync(batchId);
            if (batch == null) return false;

            if (batch.Status != PayoutStatus.Pending) return false;

            batch.Status = PayoutStatus.Processing;
            batch.UpdatedAt = DateTime.Now;

            // Move all Pending payouts to Processing
            var payouts = await _context.Payouts
                .Where(p => p.BatchId == batchId && p.Status == PayoutStatus.Pending)
                .ToListAsync();

            foreach (var p in payouts)
            {
                p.Status = PayoutStatus.Processing;
                p.ProcessedBy = processedBy;
                p.UpdatedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkBatchAsCompletedAsync(int batchId, string processedBy)
        {
            var batch = await _context.PayoutBatches.FindAsync(batchId);
            if (batch == null) return false;

            if (batch.Status != PayoutStatus.Processing) return false;

            batch.Status = PayoutStatus.Completed;
            batch.UpdatedAt = DateTime.Now;

            // Move all Processing payouts to Completed
            var payouts = await _context.Payouts
                .Where(p => p.BatchId == batchId && p.Status == PayoutStatus.Processing)
                .ToListAsync();

            foreach (var p in payouts)
            {
                p.Status = PayoutStatus.Completed;
                p.ProcessedBy = processedBy;
                p.ProcessedAt = DateTime.Now;
                p.UpdatedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
