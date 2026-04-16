using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
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
    public class OwnerPlanRepository : Repository<OwnerPlan>, IOwnerPlanRepository
    {
        public OwnerPlanRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<OwnerPlan?> GetByOwnerIdAsync(string ownerId)
        {
            return await _context.OwnerPlans
                .Include(x => x.Plan)
                .Where(x => x.OwnerId == ownerId && x.Status == OwnerPlanStatus.Active)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<OwnerPlan?> GetCurrentActiveByOwnerIdAsync(string ownerId)
        {
            var now = DateTime.Now;

            return await _context.OwnerPlans
                .Include(x => x.Plan)
                .Where(x => x.OwnerId == ownerId)
                .OrderByDescending(x => x.EndDate)
                .ThenByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();
        }
    }
}
