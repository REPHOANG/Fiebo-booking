using Fiebo.Application.DTOs.Identity;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IIdentityService _identityService;
        private readonly ITokenService _tokenService;

        public AuthService(IIdentityService identityService, ITokenService tokenService)
        {
            _identityService = identityService;
            _tokenService = tokenService;
        }

        public async Task<AuthResponse> RegisterAsync(RegistrationRequest request)
        {
            string defaultRole = AppRoles.Customer;

            if (!await _identityService.IsEmailUniqueAsync(request.Email))
                return new AuthResponse { IsSuccess = false, Message = "Email này đã được sử dụng!" };

            if (!await _identityService.IsPhoneUniqueAsync(request.PhoneNumber))
                return new AuthResponse { IsSuccess = false, Message = "Số điện thoại này đã được sử dụng!" };

            // 3. Tạo User
            var createResult = await _identityService.CreateUserAsync(
                request.Email,
                request.PhoneNumber,
                request.Password,
                request.FullName,
                defaultRole 
            );

            if (!createResult.IsSuccess)
            {
                return new AuthResponse { IsSuccess = false, Message = createResult.ErrorMessage };
            }

            var token = _tokenService.GenerateAccessToken(
                createResult.UserId,
                request.FullName,
                defaultRole,
                request.Email
            );

            return new AuthResponse
            {
                IsSuccess = true,
                Message = "Đăng ký thành công!",
                Token = token,
                FullName = request.FullName,
                Role = defaultRole
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var authResult = await _identityService.AuthenticateAsync(request.EmailOrPhone, request.Password);

            if (!authResult.IsSuccess)
            {
                return new AuthResponse { IsSuccess = false, Message = "Tài khoản hoặc mật khẩu không chính xác!" };
            }

            var token = _tokenService.GenerateAccessToken(
                authResult.UserId,
                authResult.FullName,
                authResult.Role,
                authResult.Email
            );

            return new AuthResponse
            {
                IsSuccess = true,
                Message = "Đăng nhập thành công!",
                Token = token,
                FullName = authResult.FullName,
                Role = authResult.Role
            };
        }
    }
}
