using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Fiebo.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class IdentityService : IIdentityService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<IdentityService> _logger;
        private readonly FieboDbContext _context;

        public IdentityService(UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<IdentityService> logger,
            FieboDbContext context)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
            _context = context;
        }

        public async Task<(bool IsSuccess, string UserId, string ErrorMessage)> CreateUserAsync(
    string email, string phone, string password, string fullName, string role, DateOnly? dateOfBirth)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                PhoneNumber = phone,
                FullName = fullName,
                Status = Fiebo.Domain.Enums.UserStatus.Inactive,
                DateOfBirth = dateOfBirth
            };

            var result = await _userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                return (false, string.Empty, string.Join(", ", result.Errors.Select(e => e.Description)));

            if (await _roleManager.RoleExistsAsync(role))
                await _userManager.AddToRoleAsync(user, role);

            return (true, user.Id, string.Empty);
        }

        public async Task<(bool IsSuccess, string UserId, string FullName, string Role, string Email, UserStatus Status)> AuthenticateAsync(string account, string password)
        {
            ApplicationUser? user = account.Contains("@")
                ? await _userManager.FindByEmailAsync(account)
                : await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);

            if (user == null || !await _userManager.CheckPasswordAsync(user, password))
                return (false, string.Empty, string.Empty, string.Empty, string.Empty, UserStatus.Inactive);

            var roles = await _userManager.GetRolesAsync(user);
            return (true, user.Id, user.FullName, roles.FirstOrDefault() ?? "User", user.Email!, user.Status);
        }

        public async Task<bool> IsEmailUniqueAsync(string email)
        {
            return await _userManager.FindByEmailAsync(email) == null;
        }

        public async Task<bool> IsPhoneUniqueAsync(string phone)
        {
            return !await _userManager.Users.AnyAsync(u => u.PhoneNumber == phone);
        }

        public async Task<bool> ActivateUserAsync(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return false;

            user.Status = UserStatus.Active;
            user.EmailConfirmed = true;

            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }
        public async Task<(bool IsNewUser, string UserId, string FullName, string Role, string Email)> GetOrCreateExternalUserAsync(string email, string fullName)
        {
            var user = await _userManager.FindByEmailAsync(email);
            bool isNewUser = false;

            if (user == null)
            {
                isNewUser = true;
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = fullName,
                    Status = Fiebo.Domain.Enums.UserStatus.Active,
                    EmailConfirmed = true
                };

                var result = await _userManager.CreateAsync(user);
                if (!result.Succeeded)
                    throw new BadRequestException("Lỗi tạo tài khoản từ Google.");

                await _userManager.AddToRoleAsync(user, AppRoles.Customer);
            }
            else
            {
                if (user.Status == Fiebo.Domain.Enums.UserStatus.Banned)
                    throw new UnauthorizedException("Tài khoản của bạn đã bị khóa tạm thời do nhiều lần đăng nhập không thành công.");

                if (user.Status == Fiebo.Domain.Enums.UserStatus.Inactive)
                {
                    user.Status = Fiebo.Domain.Enums.UserStatus.Active;
                    user.EmailConfirmed = true;
                    await _userManager.UpdateAsync(user);
                }
            }

            var roles = await _userManager.GetRolesAsync(user);
            return (isNewUser, user.Id, user.FullName, roles.FirstOrDefault() ?? AppRoles.Customer, user.Email!);
        }
        public async Task<ServiceResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            _logger.LogInformation("Change password requested: {UserId}", userId);
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = "Không tìm thấy người dùng"
                };
            }
            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                _logger.LogWarning("Change password failed: {UserId} - {Reason}",
            userId,
            string.Join(", ", result.Errors.Select(e => e.Description)));
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Mật khẩu của bạn đã được thay đổi thành công."
            };
        }

        public async Task<UserProfileResponse?> GetUserProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null;
            }
            return new UserProfileResponse
            {
                Id = user!.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                Roles = string.Join(", ", await _userManager.GetRolesAsync(user)),
                Status = user.Status.ToString(),
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request)
        {
            _logger.LogInformation("Update profile requested: {UserId}", userId);
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null!;
            }

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                var existedPhone = _userManager.Users
                    .FirstOrDefault(u =>
                        u.PhoneNumber == request.PhoneNumber &&
                        u.Id != user.Id);

                if (existedPhone != null)
                {
                    return new ServiceResponse
                    {
                        IsSuccess = false,
                        Message = "Số điện thoại này đã được đăng ký. Vui lòng thử số khác hoặc đăng ký."
                    };
                }

                user.PhoneNumber = request.PhoneNumber;
            }
            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName;
            if (request.DateOfBirth.HasValue)
            {
                user.DateOfBirth =
                    request.DateOfBirth;
            }
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                _logger.LogWarning("Update profile failed: {UserId} - {Reason}",
            userId,
            string.Join(", ", result.Errors.Select(e => e.Description)));
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }
            _logger.LogInformation("Update profile success: {UserId}", userId);
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Thông tin cá nhân đã được cập nhật thành công."
            };
        }

        public async Task<string> GeneratePasswordResetTokenAsync(string account)
        {
            var user = account.Contains("@")
                ? await _userManager.FindByEmailAsync(account)
                : await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);
            if (user == null)
            {
                return string.Empty;
            }
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            return token;
        }

        public async Task<UserProfileResponse?> GetUserProfileByEmailOrPhoneAsync(string account)
        {
            var user = account.Contains("@")
                ? await _userManager.FindByEmailAsync(account)
                : await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);
            if (user == null)
            {
                return null;
            }
            return new UserProfileResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                Roles = string.Join(", ", await _userManager.GetRolesAsync(user))
            };
        }

        public async Task<ServiceResponse> ResetPasswordAsync(string account, string newPassword)
        {
            var user = account.Contains("@")
                ? await _userManager.FindByEmailAsync(account)
                : await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);
            if (user == null)
            {
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = "Không tìm thấy người dùng"
                };
            }
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(
                user,
                token,
                newPassword
            );

            if (!result.Succeeded)
            {
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Mật khẩu của bạn đã được đặt lại thành công."
            };
        }

        public async Task<Dictionary<string, string>> GetUserFullNameAsync(List<string> userIds)
        {
            return await _userManager.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(
                    u => u.Id,
                    u => u.FullName
                );
        }

        public async Task<UserProfileResponse> CreateActiveUserWithoutPasswordAsync(string fullname, string phoneNumber)
        {
            var user = new ApplicationUser
            {
                UserName = phoneNumber,
                PhoneNumber = phoneNumber,
                Email = $"{phoneNumber}@fiebo.local",
                FullName = fullname,
                Status = UserStatus.Active,
            };
            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to create user without password: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Description)));
                throw new BadRequestException($"Failed to create user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
            if (await _roleManager.RoleExistsAsync(AppRoles.Customer))
                await _userManager.AddToRoleAsync(user, AppRoles.Customer);

            return new UserProfileResponse
            {
                FullName = fullname,
                Id = user.Id,
                PhoneNumber = phoneNumber,
            };
        }
        public async Task<bool> UpdateUserStatusAsync(string userId, UserStatus status)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            user.Status = status;
            var result = await _userManager.UpdateAsync(user);

            // Nếu deactive, có thể khóa luôn tài khoản để không login được
            if (status == UserStatus.Inactive)
            {
                await _userManager.SetLockoutEnabledAsync(user, true);
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
            }
            else // Re-active
            {
                await _userManager.SetLockoutEndDateAsync(user, null);
            }

            return result.Succeeded;
        }
        public async Task<List<UserProfileResponse>> GetUsersByRoleAsync(string role)
        {
            // Lấy toàn bộ user có chứa Role này từ Database thông qua UserManager
            var users = await _userManager.GetUsersInRoleAsync(role);

            // Map sang DTO để trả về cho tầng Application
            return users.Select(u => new UserProfileResponse
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Status = u.Status.ToString() // Hoặc map theo đúng kiểu Status của bạn
            }).ToList();
        }

        public async Task<PagedResult<OwnerListResponse>> GetOwnersAsync(
    int pageIndex,
    int pageSize,
    DateTime? fromDate,
    DateTime? toDate)
        {
            var query = from user in _context.Users
                        join ur in _context.UserRoles on user.Id equals ur.UserId
                        join r in _context.Roles on ur.RoleId equals r.Id
                        where r.Name == AppRoles.FieldOwner
                        select user;

            if (fromDate.HasValue)
                query = query.Where(u => u.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(u => u.CreatedAt <= toDate.Value);

            var totalCount = await query.CountAsync();

            var owners = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var ownerIds = owners.Select(o => o.Id).ToList();

            var venueCounts = await _context.Venues
                .Where(v => ownerIds.Contains(v.OwnerId))
                .GroupBy(v => v.OwnerId)
                .Select(g => new { OwnerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.OwnerId, x => x.Count);

            var fieldCounts = await (
                from f in _context.Fields
                join v in _context.Venues on f.VenueId equals v.Id
                where ownerIds.Contains(v.OwnerId)
                group f by v.OwnerId into g
                select new { OwnerId = g.Key, Count = g.Count() }
            ).ToDictionaryAsync(x => x.OwnerId, x => x.Count);

            var items = owners.Select(o => new OwnerListResponse
            {
                Id = o.Id,
                OwnerName = o.FullName,
                Email = o.Email!,
                PhoneNumber = o.PhoneNumber!,
                TotalVenues = venueCounts.TryGetValue(o.Id, out var v) ? v : 0,
                TotalFields = fieldCounts.TryGetValue(o.Id, out var f) ? f : 0
            }).ToList();

            return new PagedResult<OwnerListResponse>
            {
                Items = items,
                TotalItems = totalCount,
                Page = pageIndex,
                PageSize = pageSize
            };
        }
    }
}

