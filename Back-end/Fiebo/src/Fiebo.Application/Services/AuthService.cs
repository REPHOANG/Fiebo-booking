using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;



namespace Fiebo.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IIdentityService _identityService;
        private readonly ITokenService _tokenService;
        private readonly ISmsService _smsService;
        private readonly IUnitOfWork _unitOfWork;
        public AuthService(IIdentityService identityService,
            ITokenService tokenService,
            IUnitOfWork unitOfWork,
            ISmsService smsService)
        {
            _identityService = identityService;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
            _smsService = smsService;
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

        public Task<ServiceResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            return _identityService.ChangePasswordAsync(userId, request);
        }

        public async Task<UserProfileResponse> GetUserProfileAsync(string userId)
        {
            return await _identityService.GetUserProfileAsync(userId);
        }

        public Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request)
        {
            return _identityService.UpdateUserProfileAsync(userId, request);
        }

        public async Task<ServiceResponse> SendForgotPasswordAsync(string account)
        {
            var user = await _identityService.GetUserProfileByEmailOrPhoneAsync(account);
            if (user == null)
            {
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = "Email hoặc SĐT không tồn tại!"
                };
            }
            var token = await _identityService.GeneratePasswordResetTokenAsync(account);
            Console.WriteLine($"Generated token for {account}: {token}");
            var resetLink = $"https://localhost:5173/reset-password?userId={user.Id}&token={Uri.EscapeDataString(token)}";
            Console.WriteLine($"Reset link: {resetLink}");
            if (account.Contains("@"))
            {
                var subject = "Fiebo - Đặt lại mật khẩu";
                var body = $"Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu: {resetLink}";
                //await _identityService.SendEmailAsync(account, "Yêu cầu đặt lại mật khẩu", $"Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu: {resetLink}");
            }
            else
            {
                var message = $"Fiebo - Đặt lại mật khẩu: {resetLink}";
                //var result = await _smsService.SendSmsAsync(account, message);
                var result = new ServiceResponse { IsSuccess = true }; // Giả lập thành công
                if (!result.IsSuccess)
                {
                    return new ServiceResponse
                    {
                        IsSuccess = false,
                        Message = "Không thể gửi SMS. Vui lòng thử lại sau!"
                    };
                }
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Reset password link has been sent!"
            };
        }

        public async Task<ServiceResponse> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var result = await _identityService.ResetPasswordAsync(request);
            return new ServiceResponse
            {
                IsSuccess = result.IsSuccess,
                Message = result.IsSuccess ? "Password reset successfully!" : result.Message
            };
        }
    }
}
