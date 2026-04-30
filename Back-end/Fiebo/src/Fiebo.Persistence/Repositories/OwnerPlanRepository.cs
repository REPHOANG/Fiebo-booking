using Fiebo.Domain.Constants;
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
            return await _context.OwnerPlans
                .Include(x => x.Plan)
                .Where(x => x.OwnerId == ownerId)
                .OrderByDescending(x => x.EndDate)
                .FirstOrDefaultAsync();
        }

        public async Task<string> HasActivePlanAsync(string userId, string role)
        {
            var today = DateTime.Now.Date;

            if (role == AppRoles.FieldOwner)
            {
                var plan = await _context.OwnerPlans
                    .Where(op =>
                        op.OwnerId == userId).FirstOrDefaultAsync();
                if(plan == null)
                {
                    return OwnerPlanStatus.Inactive.ToString();
                }
                return (plan.Status == OwnerPlanStatus.Active && plan.EndDate.Date > today) ? OwnerPlanStatus.Active.ToString() : OwnerPlanStatus.Expired.ToString();
            }

            if (role == AppRoles.FieldStaff)
            {
                var ownerId = await (
                    from vs in _context.VenueStaff
                    join v in _context.Venues on vs.VenueId equals v.Id
                    where vs.StaffId == userId
                    select v.OwnerId
                ).FirstOrDefaultAsync();

                if (ownerId == null) return OwnerPlanStatus.Inactive.ToString();

                var plan = await _context.OwnerPlans
                    .Where(op =>
                        op.OwnerId == userId).FirstOrDefaultAsync();
                if (plan == null)
                {
                    return OwnerPlanStatus.Inactive.ToString();
                }
                return (plan.Status == OwnerPlanStatus.Active && plan.EndDate.Date > today) ? OwnerPlanStatus.Active.ToString() : OwnerPlanStatus.Expired.ToString();
            }

            return OwnerPlanStatus.Inactive.ToString();
        }
    }
}
