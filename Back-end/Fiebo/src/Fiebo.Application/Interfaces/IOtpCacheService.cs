using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IOtpCacheService
    {
        Task SetOtpAsync(string userId, string hash, TimeSpan expire);

        Task<string?> GetOtpAsync(string userId);

        Task RemoveOtpAsync(string userId);
    }

}
