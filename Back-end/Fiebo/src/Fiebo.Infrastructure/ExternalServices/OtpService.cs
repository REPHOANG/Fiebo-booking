using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class OtpService : IOtpService
    {
        private readonly ICacheService _cacheService;
        private readonly IConfiguration _configuration;

        public OtpService(ICacheService cacheService, IConfiguration configuration)
        {
            _cacheService = cacheService;
            _configuration = configuration;
        }

        public async Task<(string OtpCode, int ExpireMinutes)> GenerateAndStoreOtpAsync(string email)
        {
            var otpCode = new Random().Next(100000, 999999).ToString();

            var cacheKey = $"otp_register:{email}";

            if (!int.TryParse(_configuration["OtpSettings:ExpiryMinutes"], out int expireMinutes))
            {
                expireMinutes = 5;
            }

            await _cacheService.SetAsync(cacheKey, otpCode, TimeSpan.FromMinutes(expireMinutes));

            return (otpCode, expireMinutes);
        }

        public async Task<(string OtpCode, int ExpireMinutes)> GenerateAndStoreResetOtpAsync(string account)
        {
            var otpCode = new Random().Next(100000, 999999).ToString();

            var cacheKey = $"otp_reset:{account}";

            if (!int.TryParse(_configuration["OtpSettings:ExpiryMinutes"], out int expireMinutes))
            {
                expireMinutes = 5;
            }

            await _cacheService.SetAsync(cacheKey, otpCode, TimeSpan.FromMinutes(expireMinutes));

            return (otpCode, expireMinutes);
        }

        public async Task<(string OtpCode, int ExpireMinutes)> GenerateAndStoreLoginOtpAsync(string account)
        {
            var otpCode = new Random().Next(100000, 999999).ToString();

            var cacheKey = $"otp_login:{account}";

            if (!int.TryParse(_configuration["OtpSettings:ExpiryMinutes"], out int expireMinutes))
            {
                expireMinutes = 5;
            }

            await _cacheService.SetAsync(cacheKey, otpCode, TimeSpan.FromMinutes(expireMinutes));

            return (otpCode, expireMinutes);
        }

        public async Task<bool> ValidateOtpAsync(string email, string otpCode)
        {
            var cacheKey = $"otp_register:{email}";
            var cachedOtp = await _cacheService.GetAsync(cacheKey);

            if (string.IsNullOrEmpty(cachedOtp) || cachedOtp != otpCode)
            {
                return false;
            }

            await _cacheService.RemoveAsync(cacheKey);

            return true;
        }

        public async Task<string> ValidateResetOtpAsync(string account, string otpCode)
        {
            var cacheKey = $"otp_reset:{account}";
            var cachedOtp = await _cacheService.GetAsync(cacheKey);

            if (string.IsNullOrEmpty(cachedOtp) || cachedOtp != otpCode)
            {
                return null!;
            }

            await _cacheService.RemoveAsync(cacheKey);
            var resetToken = Guid.NewGuid().ToString();

            await _cacheService.SetAsync(
                $"reset_token:{resetToken}",
                account,
                TimeSpan.FromMinutes(10)
            );

            return resetToken;
        }
    }
}
