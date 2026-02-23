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
        Task<AuthResponse> RegisterAsync(RegistrationRequest request);
        Task<ServiceResponse> ChangePasswordAsync(string email, ChangePasswordRequest request);
        Task<UserProfileResponse> GetUserProfileAsync(string userId);
        Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request);
        Task<ServiceResponse> SendForgotPasswordAsync(string account);
        Task<ServiceResponse> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
