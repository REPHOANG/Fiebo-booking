using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class CacheService : ICacheService
    {
        private readonly IDatabase _db;

        public CacheService(IConfiguration configuration)
        {
            var connectionString = configuration["Redis:ConnectionString"];
            var redis = ConnectionMultiplexer.Connect(connectionString!);
            _db = redis.GetDatabase();
        }

        public Task SetAsync(string key, string value, TimeSpan expiration)
            => _db.StringSetAsync(key, value, expiration);

        public async Task<string?> GetAsync(string key)
            => await _db.StringGetAsync(key);

        public Task RemoveAsync(string key)
            => _db.KeyDeleteAsync(key);
    }
}
