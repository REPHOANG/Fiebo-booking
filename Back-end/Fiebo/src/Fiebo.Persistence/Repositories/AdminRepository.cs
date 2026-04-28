using Fiebo.Application.DTOs.Admin;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Fiebo.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories
{
    public class AdminRepository : IAdminRepository
    {
        private readonly FieboDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        public AdminRepository(FieboDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<PagedResult<CustomerResponse>> GetCustomersWithFilterAsync(CustomerFilter filter)
        {
            var query = (from user in _context.Users
                         join userRole in _context.UserRoles on user.Id equals userRole.UserId
                         join role in _context.Roles on userRole.RoleId equals role.Id
                         where role.Name == "Customer"
                         select user).AsNoTracking();

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(u => (u.FullName != null && u.FullName.ToLower().Contains(term)) ||
                                         (u.Email != null && u.Email.ToLower().Contains(term)) ||
                                         (u.PhoneNumber != null && u.PhoneNumber.Contains(term)) ||
                                         (u.UserName != null && u.UserName.ToLower().Contains(term)));
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(u => u.Status == (UserStatus)filter.Status.Value);
            }

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderBy(u => u.FullName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(u => new CustomerResponse
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email ?? "",
                    PhoneNumber = u.PhoneNumber ?? "",
                    Status = u.Status.ToString(),
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<CustomerResponse>
            {
                Page = filter.PageNumber,
                PageSize = filter.PageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<string> ResetFinanceAdminPasswordAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new Exception("Không tìm thấy người dùng.");

            string newPassword = Guid.NewGuid().ToString("N").Substring(0, 8);

            await _userManager.RemovePasswordAsync(user);
            var result = await _userManager.AddPasswordAsync(user, newPassword);

            if (!result.Succeeded)
            {
                throw new Exception("Lỗi khi đặt mật khẩu mới: " + result.Errors.FirstOrDefault()?.Description);
            }

            return newPassword;
        }
    }
}