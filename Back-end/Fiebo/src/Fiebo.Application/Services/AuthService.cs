using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Text.RegularExpressions;
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
        private readonly ICacheService _cacheService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IIdentityService identityService,

            ITokenService tokenService,

            IUnitOfWork unitOfWork,
            ISmsService smsService,
            IOtpService otpService,
            IEmailService emailService,
            IGoogleAuthService googleAuthService,
            ICacheService cacheService,
            ILogger<AuthService> logger
            )
        {
            _identityService = identityService;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
            _otpService = otpService;
            _emailService = emailService;
            _googleAuthService = googleAuthService;
            _smsService = smsService;
            _cacheService = cacheService;
            _logger = logger;
        }

        public async Task<string> RegisterAsync(RegistrationRequest request)
        {
            if (!await _identityService.IsEmailUniqueAsync(request.Email))
                throw new BadRequestException("Địa chỉ email này đã được đăng ký. Vui lòng sử dụng email hoặc đăng nhập khác.");
            if (!await _identityService.IsPhoneUniqueAsync(request.PhoneNumber))
                throw new BadRequestException("Số điện thoại này đã được đăng ký. Vui lòng thử số khác hoặc đăng ký.");

            if (request.Role != AppRoles.Customer && request.Role != AppRoles.FieldOwner)
                throw new BadRequestException("Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");

            var createResult = await _identityService.CreateUserAsync(
                    request.Email,
                    request.PhoneNumber,
                    request.Password,
                    request.FullName,
                    request.Role,
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

            return "Mã OTP xác thực đã được gửi đến email của bạn.";
        }

        public async Task<string> VerifyEmailAsync(VerifyOtpRequest request)
        {
            var isOtpValid = await _otpService.ValidateOtpAsync(request.Email, request.OtpCode);
            if (!isOtpValid)
                throw new BadRequestException("Mã OTP không hợp lệ. Vui lòng thử lại.");

            var isActivated = await _identityService.ActivateUserAsync(request.Email);
            if (!isActivated)
                throw new BadRequestException("Lỗi lấy dữ liệu.");

            return "Tài khoản của bạn đã được kích hoạt thành công.";
        }



        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailOrPhone) || string.IsNullOrWhiteSpace(request.Password))
                throw new BadRequestException("Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");

            var input = request.EmailOrPhone.Trim();

            if (input.Contains("@"))
            {
                if (!Regex.IsMatch(input, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    throw new BadRequestException("Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");
            }
            else
            {
                if (!Regex.IsMatch(input, @"^0\d{9,10}$"))
                    throw new BadRequestException("Định dạng số điện thoại không hợp lệ. Vui lòng nhập số điện thoại hợp lệ.");
            }

            var authResult = await _identityService.AuthenticateAsync(input, request.Password);

            if (!authResult.IsSuccess)
                throw new UnauthorizedException("Địa chỉ email/số điện thoại hoặc mật khẩu không hợp lệ.");

            if (authResult.Status == UserStatus.Banned)
                throw new UnauthorizedException("Tài khoản của bạn đã bị khóa tạm thời do nhiều lần đăng nhập không thành công.");

            if (authResult.Status == UserStatus.Inactive)
                throw new UnauthorizedException("Phiên đăng nhập của bạn đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.");

            var token = _tokenService.GenerateAccessToken(authResult.UserId, authResult.FullName, authResult.Role, authResult.Email);
            var refreshToken = _tokenService.GenerateRefreshToken();
            
            // Set refresh token valid for 7 days
            await _identityService.UpdateRefreshTokenAsync(authResult.UserId, refreshToken, DateTime.Now.AddDays(7));

            _logger.LogInformation("Đăng nhập thành công: {Account}", input);
            return new AuthResponse 
            { 
                AccessToken = token, 
                RefreshToken = refreshToken 
            };
        }

        public async Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request)
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

            var token = _tokenService.GenerateAccessToken(userResult.UserId, userResult.FullName, userResult.Role, userResult.Email);
            var refreshToken = _tokenService.GenerateRefreshToken();
            
            // Set refresh token valid for 7 days
            await _identityService.UpdateRefreshTokenAsync(userResult.UserId, refreshToken, DateTime.Now.AddDays(7));

            return new AuthResponse 
            { 
                AccessToken = token, 
                RefreshToken = refreshToken 
            };
        }

        public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
        {
            var principal = _tokenService.GetPrincipalFromExpiredToken(request.AccessToken);
            if (principal == null)
            {
                throw new BadRequestException("Token không hợp lệ.");
            }

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                      ?? principal.FindFirst("sub")?.Value; // depending on how sub is mapped

            if (string.IsNullOrEmpty(userId))
            {
                throw new BadRequestException("Token không hợp lệ.");
            }

            var isValid = await _identityService.ValidateRefreshTokenAsync(userId, request.RefreshToken);
            if (!isValid)
            {
                throw new BadRequestException("Refresh token không hợp lệ hoặc đã hết hạn.");
            }

            var newAccessToken = _tokenService.GenerateAccessToken(
                userId,
                principal.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "",
                principal.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "",
                principal.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? ""
            );
            
            var newRefreshToken = _tokenService.GenerateRefreshToken();
            await _identityService.UpdateRefreshTokenAsync(userId, newRefreshToken, DateTime.Now.AddDays(7));

            return new AuthResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken
            };
        }

        public Task<ServiceResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            return _identityService.ChangePasswordAsync(userId, request);
        }

        public async Task<UserProfileServiceResponse> GetUserProfileAsync(string userId)
        {
            var result = await _identityService.GetUserProfileAsync(userId);
            if (result == null)
            {
                _logger.LogWarning("Get user profile failed - user not found: {UserId}", userId);
                throw new NotFoundException("Không có dữ liệu hợp lệ.");
            }
            bool? hasSubscription = null;
            bool? hasBankAccount = null;
            if (result.Roles == AppRoles.FieldOwner || result.Roles == AppRoles.FieldStaff)
            {
                hasSubscription = await _unitOfWork.OwnerPlans
                    .HasActivePlanAsync(userId, result.Roles);
            }
                hasBankAccount = await _unitOfWork.UserBankAccounts
                    .GetSingleAsync(b => b.UserId == userId) != null;
            return new UserProfileServiceResponse
            {
                Id = result.Id,
                Email = result.Email,
                FullName = result.FullName,
                PhoneNumber = result.PhoneNumber,
                DateOfBirth = result.DateOfBirth,
                Roles = result.Roles,
                Status = result.Status,
                HasSubscription = hasSubscription,
                HasBankAccount = hasBankAccount
            };
        }

        public async Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request)
        {
            var result = await _identityService.UpdateUserProfileAsync(userId, request);
            if (result == null)
            {
                _logger.LogWarning("Get user profile failed - user not found: {UserId}", userId);
                throw new NotFoundException("Không có dữ liệu hợp lệ.");
            }
            return result;
        }

        public async Task<ServiceResponse> SendForgotPasswordAsync(string account)
        {
            var user = await _identityService.GetUserProfileByEmailOrPhoneAsync(account);
            if (user == null)
            {
                _logger.LogWarning("Forgot password failed - account not found: {Account}",
            account);
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = "Email hoặc SĐT không tồn tại!"
                };
            }
            var otpResult = await _otpService.GenerateAndStoreResetOtpAsync(account);
            var vietnamTime = DateTimeOffset.UtcNow.AddHours(7);
            var expirationTime = vietnamTime.AddMinutes(otpResult.ExpireMinutes);
            string expiredTimeStr = expirationTime.ToString("HH:mm 'ngày' dd/MM/yyyy");
            if (account.Contains("@"))
            {
                var subject = "Fiebo - Đặt lại mật khẩu";
                var emailBody = $@"
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>

    <h2 style='color: #2c3e50; text-align: center;'>
        Đặt lại mật khẩu Fiebo
    </h2>

    <p>Xin chào,</p>

    <p>
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>Fiebo</strong> của bạn.
    </p>

    <p>
        Vui lòng sử dụng mã xác thực bên dưới để tiếp tục quá trình đặt lại mật khẩu:
    </p>

    <div style='
        text-align: center;
        font-size: 28px;
        font-weight: bold;
        color: #ffffff;
        background-color: #e67e22;
        padding: 12px;
        border-radius: 6px;
        letter-spacing: 4px;
        margin: 20px 0;
    '>
        {otpResult.OtpCode}
    </div>

    <p>
        Mã này có hiệu lực trong <strong>{otpResult.ExpireMinutes} phút</strong>.
        Vui lòng không chia sẻ với bất kỳ ai.
    </p>

    <p>
        Sẽ hết hạn vào lúc:
        <b style='color: #d9534f;'>{expiredTimeStr}</b>
    </p>

    <p>
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        Tài khoản của bạn vẫn an toàn.
    </p>

    <hr style='margin: 30px 0;' />

    <p style='font-size: 12px; color: #888; text-align: center;'>
        © {DateTime.Now.Year} Fiebo. All rights reserved.
    </p>

</div>";
                await _emailService.SendEmailAsync(account, subject, emailBody);
                _logger.LogInformation("Reset OTP sent via Email: {Account}", account);
            }
            else
            {
                var message = $"Ma OTP Fiebo: {otpResult.OtpCode}. Hieu luc 5 phut.";
                var result = await _smsService.SendSmsAsync(account, message);
                if (!result.IsSuccess)
                {
                    _logger.LogError("Send SMS failed: {Account} - {Reason}",
            account,
            result.Message);
                    return new ServiceResponse
                    {
                        IsSuccess = false,
                        Message = result.Message
                    };
                }
                _logger.LogInformation("Reset OTP sent via SMS: {Account}", account);
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email hoặc SMS của bạn để lấy mã OTP đặt lại mật khẩu."
            };
        }

        public async Task<string> VerifyResetOtpAsync(VerifyResetOtpRequest request)
        {
            _logger.LogInformation("Verify reset OTP: {Account}",
        request.Account);
            var resetToken = await _otpService.ValidateResetOtpAsync(request.Account, request.OtpCode);
            _logger.LogInformation("Verify reset OTP success: {Account}",
        request.Account);
            return resetToken;
        }

        public async Task<ServiceResponse> ResetPasswordAsync(ResetPasswordRequest request)
        {
            _logger.LogInformation("Reset password requested");
            var account = await _cacheService.GetAsync($"reset_token:{request.ResetToken}");
            if (string.IsNullOrEmpty(account))
            {
                _logger.LogWarning("Reset password failed - invalid token");
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."
                };
            }
            var result = await _identityService.ResetPasswordAsync(account, request.NewPassword);
            if (!result.IsSuccess)
            {
                _logger.LogWarning("Reset password failed: {Account} - {Reason}",
                    account,
                    result.Message);

                return result;
            }
            await _cacheService.RemoveAsync($"reset_token:{request.ResetToken}");
            _logger.LogInformation("Password reset successful: {Account}", account);
            return new ServiceResponse
            {
                IsSuccess = result.IsSuccess,
                Message = result.Message
            };
        }
    }
}