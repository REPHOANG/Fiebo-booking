using Fiebo.Application.DTOs.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<string> RegisterAsync(RegistrationRequest request);
        Task<string> VerifyEmailAsync(VerifyOtpRequest request);
        Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request);
        Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);
        Task<ServiceResponse> ChangePasswordAsync(string email, ChangePasswordRequest request);
        Task<UserProfileServiceResponse> GetUserProfileAsync(string userId);
        Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request);
        Task<ServiceResponse> SendForgotPasswordAsync(string account);
        Task<ServiceResponse> ResetPasswordAsync(ResetPasswordRequest request);
        Task<string> VerifyResetOtpAsync(VerifyResetOtpRequest request);
    }
}
