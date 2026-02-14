using Fiebo.Application.Interfaces;
using Fiebo.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
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

        public async Task<(bool IsSuccess, string UserId, string ErrorMessage)> CreateUserAsync(string email, string phone, string password, string fullName, string role)
        {
            var user = new ApplicationUser
            {
                UserName = email, 
                Email = email,
                PhoneNumber = phone,
                FullName = fullName
            };

            // 1. Tạo User
            var result = await _userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return (false, string.Empty, errors);
            }

            
            if (await _roleManager.RoleExistsAsync(role))
            {
                await _userManager.AddToRoleAsync(user, role);
            }

            return (true, user.Id, string.Empty);
        }

        public async Task<(bool IsSuccess, string UserId, string FullName, string Role, string Email)> AuthenticateAsync(string account, string password)
        {
            ApplicationUser? user = null;

            if (account.Contains("@"))
            {
                user = await _userManager.FindByEmailAsync(account);
            }
            else
            {
                user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == account);
            }

            if (user == null) return (false, string.Empty, string.Empty, string.Empty, string.Empty);

            if (!await _userManager.CheckPasswordAsync(user, password))
                return (false, string.Empty, string.Empty, string.Empty, string.Empty);

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? "User";

            return (true, user.Id, user.FullName, role, user.Email!);
        }

        public async Task<bool> IsEmailUniqueAsync(string email)
        {
            return await _userManager.FindByEmailAsync(email) == null;
        }

        public async Task<bool> IsPhoneUniqueAsync(string phone)
        {
            return !await _userManager.Users.AnyAsync(u => u.PhoneNumber == phone);
        }

    }
}
