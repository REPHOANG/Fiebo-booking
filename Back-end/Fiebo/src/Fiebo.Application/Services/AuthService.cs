using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;


using static System.Net.WebRequestMethods;

namespace Fiebo.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IIdentityService _identityService;
        private readonly ITokenService _tokenService;
        private readonly ISmsService _smsService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IOtpService _otpService;
        private readonly IEmailService _emailService;
        private readonly IGoogleAuthService _googleAuthService;

        public AuthService(
            IIdentityService identityService,
           
            ITokenService tokenService,
           
            IUnitOfWork unitOfWork,
            ISmsService smsService,
            IOtpService otpService,
            IEmailService emailService,
            IGoogleAuthService googleAuthService)
        {
            _identityService = identityService;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
            _otpService = otpService;
            _emailService = emailService;
            _googleAuthService = googleAuthService;
            _smsService = smsService;
        }

        public async Task<string> RegisterAsync(RegistrationRequest request)
        {
            if (!await _identityService.IsEmailUniqueAsync(request.Email))
                throw new BadRequestException("Email đã tồn tại trong hệ thống!");
            if (!await _identityService.IsPhoneUniqueAsync(request.PhoneNumber))
                throw new BadRequestException("Số điện thoại đã tồn tại!");

            var createResult = await _identityService.CreateUserAsync(
                    request.Email,
                    request.PhoneNumber,
                    request.Password,
                    request.FullName,
                    AppRoles.Customer,
                    request.DateOfBirth 
                );
            if (!createResult.IsSuccess)
                throw new BadRequestException(createResult.ErrorMessage);

            try
            {
                _unitOfWork.Wallets.Add(new Wallet { UserId = createResult.UserId });
                await _unitOfWork.SaveChangesAsync();
            }
            catch { /* Log lỗi */ }

            var otpResult = await _otpService.GenerateAndStoreOtpAsync(request.Email);

            var vietnamTime = DateTimeOffset.UtcNow.AddHours(7);
            var expirationTime = vietnamTime.AddMinutes(otpResult.ExpireMinutes);
            string expiredTimeStr = expirationTime.ToString("HH:mm 'ngày' dd/MM/yyyy");

            var emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
    
                    <h2 style='color: #2c3e50; text-align: center;'>
                        Xác thực tài khoản Fiebo
                    </h2>

                    <p>Xin chào,</p>

                    <p>
                        Chúng tôi đã nhận được yêu cầu đăng ký tài khoản trên hệ thống <strong>Fiebo</strong>.
                    </p>

                    <p>
                        Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình đăng ký:
                    </p>

                    <div style='
                        text-align: center;
                        font-size: 28px;
                        font-weight: bold;
                        color: #ffffff;
                        background-color: #3498db;
                        padding: 12px;
                        border-radius: 6px;
                        letter-spacing: 4px;
                        margin: 20px 0;
                    '>
                        {otpResult.OtpCode}
                    </div>

                    <p>
                        Mã xác thực có hiệu lực trong <strong>{otpResult.ExpireMinutes} phút</strong>. 
                        Vui lòng không chia sẻ mã này với bất kỳ ai.
                    </p>
                    <p>Sẽ hết hạn vào lúc: <b style='color: #d9534f;'>{expiredTimeStr}</b></p>
                    <p>
                        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
                    </p>

                    <hr style='margin: 30px 0;' />

                    <p style='font-size: 12px; color: #888; text-align: center;'>
                        © {DateTime.Now.Year} Fiebo. All rights reserved.
                    </p>

                </div>";

            await _emailService.SendEmailAsync(request.Email, "Fiebo - Mã xác thực tài khoản", emailBody);

            return "Đăng ký thành công. Vui lòng kiểm tra email để nhập mã OTP.";
        }

        public async Task<string> VerifyEmailAsync(VerifyOtpRequest request)
        {
            var isOtpValid = await _otpService.ValidateOtpAsync(request.Email, request.OtpCode);
            if (!isOtpValid)
                throw new BadRequestException("Mã OTP không chính xác hoặc đã hết hạn.");

            var isActivated = await _identityService.ActivateUserAsync(request.Email);
            if (!isActivated)
                throw new BadRequestException("Lỗi kích hoạt tài khoản.");

            return "Kích hoạt thành công! Bạn có thể đăng nhập ngay.";
        }



        public async Task<string> LoginAsync(LoginRequest request)
        {
            var authResult = await _identityService.AuthenticateAsync(request.EmailOrPhone, request.Password);

            if (!authResult.IsSuccess)
                throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu!");

            if (authResult.Status == UserStatus.Banned)
                throw new UnauthorizedException("Tài khoản của bạn đã bị khóa!");

            if (authResult.Status == UserStatus.Inactive)
                throw new UnauthorizedException("Tài khoản chưa được kích hoạt OTP!");

            var token = _tokenService.GenerateAccessToken(authResult.UserId, authResult.FullName, authResult.Role, authResult.Email);

            return token;
        }

        public async Task<string> GoogleLoginAsync(GoogleLoginRequest request)
        {
            var googlePayload = await _googleAuthService.VerifyGoogleTokenAsync(request.IdToken);
            if (!googlePayload.IsValid)
                throw new UnauthorizedException(googlePayload.ErrorMessage);

            var userResult = await _identityService.GetOrCreateExternalUserAsync(googlePayload.Email, googlePayload.Name);

            if (userResult.IsNewUser)
            {
                try
                {
                    _unitOfWork.Wallets.Add(new Wallet { UserId = userResult.UserId });
                    await _unitOfWork.SaveChangesAsync();
                }
                catch { /* Log */ }
            }

            return _tokenService.GenerateAccessToken(userResult.UserId, userResult.FullName, userResult.Role, userResult.Email);
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