using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IOtpService
    {
        Task<(string OtpCode, int ExpireMinutes)> GenerateAndStoreOtpAsync(string email);

        Task<bool> ValidateOtpAsync(string email, string otpCode);
    }
}
