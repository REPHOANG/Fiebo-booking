using Fiebo.Application.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly IConfiguration _configuration;

        public GoogleAuthService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<(bool IsValid, string Email, string Name, string ErrorMessage)> VerifyGoogleTokenAsync(string idToken)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { _configuration["Authentication:Google:ClientId"]! },
                    IssuedAtClockTolerance = TimeSpan.FromMinutes(5),
                    ExpirationTimeClockTolerance = TimeSpan.FromMinutes(5)
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

                return (true, payload.Email, payload.Name, string.Empty);
            }
            catch (InvalidJwtException)
            {
                return (false, string.Empty, string.Empty, "Token Google không hợp lệ hoặc đã hết hạn.");
            }
        }
    }
}
