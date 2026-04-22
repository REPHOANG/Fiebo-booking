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
    }
}
