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
    public class SubscriptionPlanRepository : Repository<SubscriptionPlan>, ISubscriptionPlanRepository
    {
        public SubscriptionPlanRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<SubscriptionPlan>> GetAllPlansAsync()
        {
            return await _context.SubscriptionPlans
                .AsNoTracking()
                .OrderBy(p => p.Price)
                .ToListAsync();
        }

        /// <summary>
        /// Override GetByIdAsync để áp dụng Global Query Filter.
        /// FindAsync trong base class bypass query filter nên cần dùng LINQ thay thế.
        /// Trả về null nếu gói không tồn tại HOẶC đã bị xóa mềm.
        /// </summary>
        public new async Task<SubscriptionPlan?> GetByIdAsync(int id)
        {
            // FirstOrDefaultAsync đi qua HasQueryFilter → tự lọc IsDeleted = true
            return await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        /// <summary>
        /// Kiểm tra gói đăng ký đã có owner nào đăng ký chưa.
        /// Dùng để quyết định edit trực tiếp hay soft-delete + tạo mới.
        /// </summary>
        public async Task<bool> HasSubscribersAsync(int planId)
        {
            return await _context.OwnerPlans
                .AsNoTracking()
                .AnyAsync(op => op.PlanId == planId);
        }

        /// <summary>
        /// Kiểm tra tên gói đã tồn tại trong hệ thống chưa (không tính gói đã xóa mềm).
        /// excludeId dùng khi edit để không tính chính gói đang được sửa.
        /// </summary>
        public async Task<bool> IsNameExistsAsync(string name, int? excludeId = null)
        {
            return await _context.SubscriptionPlans
                .AsNoTracking()
                .AnyAsync(p => p.Name == name && (excludeId == null || p.Id != excludeId));
        }
    }
}

