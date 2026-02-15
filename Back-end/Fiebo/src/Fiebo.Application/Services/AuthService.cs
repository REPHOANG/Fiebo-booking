using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
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
        private readonly IUnitOfWork _unitOfWork;
        public AuthService(IIdentityService identityService, ITokenService tokenService, IUnitOfWork unitOfWork)
        {
            _identityService = identityService;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponse> RegisterAsync(RegistrationRequest request)
        {
            if (!await _identityService.IsEmailUniqueAsync(request.Email))
                return new AuthResponse { IsSuccess = false, Message = "Email đã tồn tại!" };
            if (!await _identityService.IsPhoneUniqueAsync(request.PhoneNumber))
                return new AuthResponse { IsSuccess = false, Message = "SĐT đã tồn tại!" };

            var role = AppRoles.Customer;
            var createResult = await _identityService.CreateUserAsync(request.Email, request.PhoneNumber, request.Password, request.FullName, role);

            if (!createResult.IsSuccess)
                return new AuthResponse { IsSuccess = false, Message = createResult.ErrorMessage };

            var wallet = new Wallet { UserId = createResult.UserId, Balance = 0 };
            _unitOfWork.Wallets.Add(wallet);
            await _unitOfWork.SaveChangesAsync();

            var token = _tokenService.GenerateAccessToken(createResult.UserId, request.FullName, role, request.Email);
            return new AuthResponse { IsSuccess = true, Token = token, FullName = request.FullName, Role = role, Message = "Đăng ký thành công" };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var authResult = await _identityService.AuthenticateAsync(request.EmailOrPhone, request.Password);

            if (!authResult.IsSuccess)
                return new AuthResponse { IsSuccess = false, Message = "Sai tài khoản hoặc mật khẩu!" };

            if (authResult.Status == UserStatus.Banned)
                return new AuthResponse { IsSuccess = false, Message = "Tài khoản của bạn đã bị khóa!" };

            var token = _tokenService.GenerateAccessToken(authResult.UserId, authResult.FullName, authResult.Role, authResult.Email);
            return new AuthResponse { IsSuccess = true, Token = token, FullName = authResult.FullName, Role = authResult.Role, Message = "Đăng nhập thành công" };
        }
    }
}
