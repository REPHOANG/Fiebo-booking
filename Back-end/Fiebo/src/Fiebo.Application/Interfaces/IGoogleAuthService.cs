using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IGoogleAuthService
    {
        Task<(bool IsValid, string Email, string Name, string ErrorMessage)> VerifyGoogleTokenAsync(string idToken);
    }
}
