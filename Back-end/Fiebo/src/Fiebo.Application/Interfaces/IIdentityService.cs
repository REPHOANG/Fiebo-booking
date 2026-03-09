using Fiebo.Application.DTOs.Auth;
using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IIdentityService
    {
        Task<(bool IsSuccess, string UserId, string ErrorMessage)> CreateUserAsync(
            string email, string phone, string password, string fullName, string role, DateOnly? dateOfBirth);

        Task<bool> ActivateUserAsync(string email);
        Task<bool> IsEmailUniqueAsync(string email);
        Task<bool> IsPhoneUniqueAsync(string phone);
        Task<(bool IsSuccess, string UserId, string FullName, string Role, string Email, Fiebo.Domain.Enums.UserStatus Status)> AuthenticateAsync(string account, string password);

        Task<(bool IsNewUser, string UserId, string FullName, string Role, string Email)> GetOrCreateExternalUserAsync(string email, string fullName);
        Task<ServiceResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request);
        Task<UserProfileResponse?> GetUserProfileAsync(string userId);
        Task<ServiceResponse> UpdateUserProfileAsync(string userId, UserProfileRequest request);
        Task<UserProfileResponse> GetUserProfileByEmailOrPhoneAsync(string account);
        Task<string> GeneratePasswordResetTokenAsync(string account);
        Task<ServiceResponse> ResetPasswordAsync(string account, string newPassword);
        Task<Dictionary<string, string>> GetUserFullNameAsync(List<string> userIds);
        Task<UserProfileResponse> CreateActiveUserWithoutPasswordAsync(string fullname, string phoneNumber);

    }
}
