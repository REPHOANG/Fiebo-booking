using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IOwnerPlanRepository : IRepository<OwnerPlan>
    {
        Task<OwnerPlan?> GetByOwnerIdAsync(string ownerId);
        Task<OwnerPlan?> GetLatestActiveAsync(string ownerId, int planId);
        Task<OwnerPlan?> GetCurrentActiveByOwnerIdAsync(string ownerId);
        Task<List<OwnerPlan>> GetByOwnerIdAsync(string ownerId);
    }
}
