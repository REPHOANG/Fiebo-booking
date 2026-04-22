using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(string userId, string fullName, string role, string email);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
