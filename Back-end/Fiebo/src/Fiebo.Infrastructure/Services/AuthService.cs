using Fiebo.Application.DTOs.Identity;
using Fiebo.Application.Interfaces;
using Fiebo.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;

        public AuthService(UserManager<ApplicationUser> userManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _configuration = configuration;
        }
        public async Task<AuthResponse> RegisterAsync(RegistrationRequest request)
        {
            // check email
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
                return new AuthResponse { IsSuccess = false, Message = "Email đã được sử dụng!" };

            // create new user
            var user = new ApplicationUser
            {
                Email = request.Email,
                UserName = request.Email, 
                FullName = request.Name,
                PhoneNumber = request.PhoneNumber,
                DateOfBirth = request.DateOfBirth,
            };

            // save into DB using Identity (Hash Password automatically)
            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return new AuthResponse { IsSuccess = false, Message = errors };
            }


            return new AuthResponse
            {
                IsSuccess = true,
                Token = GenerateJwtToken(user),
                Name = user.FullName
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.EmailOrPhone);
            if (user == null)
                return new AuthResponse { IsSuccess = false, Message = "Tài khoản không tồn tại!" };

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
                return new AuthResponse { IsSuccess = false, Message = "Sai mật khẩu!" };

            return new AuthResponse
            {
                IsSuccess = true,
                Token = GenerateJwtToken(user),
                Name = user.FullName
            };
        }

        private string GenerateJwtToken(ApplicationUser user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Identity Id là dạng chuỗi
                new Claim(JwtRegisteredClaimNames.Email, user.Email!),
                new Claim(ClaimTypes.Name, user.FullName)
            };

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpiryMinutes"]!)),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
