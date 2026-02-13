using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class OtpCacheService : IOtpCacheService
    {
        private readonly IDistributedCache _cache;

        public OtpCacheService(IDistributedCache cache)
        {
            _cache = cache;
        }

        private string GetKey(string userId)
            => $"otp:user:{userId}";

        public async Task SetOtpAsync(
            string userId,
            string hash,
            TimeSpan expire)
        {
            await _cache.SetStringAsync(
                GetKey(userId),
                hash,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = expire
                });
        }

        public async Task<string?> GetOtpAsync(string userId)
        {
            return await _cache.GetStringAsync(GetKey(userId));
        }

        public async Task RemoveOtpAsync(string userId)
        {
            await _cache.RemoveAsync(GetKey(userId));
        }
    }
}
