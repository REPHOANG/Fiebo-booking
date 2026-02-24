using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Services
{
    public class IdentityService : IIdentityService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public IdentityService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
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
                    throw new UnauthorizedException("Tài khoản của bạn đã bị khóa!");

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
            return new ServiceResponse
            {
                IsSuccess = result.Succeeded,
                Message = result.Succeeded
        ? "Thay đổi mật khẩu thành công"
        : string.Join(", ", result.Errors.Select(e => e.Description))
            };
        }

        public async Task<UserProfileResponse> GetUserProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null!;
            }
            return new UserProfileResponse
            {
                Id = user!.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                Roles = string.Join(", ", await _userManager.GetRolesAsync(user))
            };
        }

        public async Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request)
        {
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
                        Message = "Số điện thoại này đã được sử dụng"
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
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Cập nhật thông tin người dùng thành công"
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

        public async Task<UserProfileResponse> GetUserProfileByEmailOrPhoneAsync(string account)
        {
            var user = account.Contains("@")
                ? await _userManager.FindByEmailAsync(account)
                : await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);
            if (user == null)
            {
                return null!;
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
                Message = "Đặt lại mật khẩu thành công"
            };
        }
    }
}

