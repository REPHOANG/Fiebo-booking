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

        public async Task<OwnerPlan?> GetLatestActiveAsync(string ownerId, int planId)
        {
            return await _context.OwnerPlans
                .Where(x => x.OwnerId == ownerId && x.PlanId == planId && x.Status == OwnerPlanStatus.Active)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();
        }
    }
}
