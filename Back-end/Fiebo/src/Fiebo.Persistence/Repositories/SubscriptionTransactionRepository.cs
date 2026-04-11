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
    public class SubscriptionTransactionRepository : Repository<SubscriptionTransaction>, ISubscriptionTransactionRepository
    {
        public SubscriptionTransactionRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<SubscriptionTransaction>> GetByOwnerIdAsync(string ownerId)
        {
            return await _context.SubscriptionTransactions
                .Include(x => x.Plan)
                .Where(x => x.OwnerPlan.OwnerId == ownerId)
                .OrderByDescending(x => x.PaidAt)
                .ToListAsync();
        }
    }
}
