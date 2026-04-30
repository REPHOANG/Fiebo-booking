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

        // Lua script: only delete the key if the stored value matches the lockValue
        // This prevents accidentally releasing a lock held by another request
        private static readonly LuaScript _releaseLockScript = LuaScript.Prepare(
            "if redis.call('get', @key) == @value then " +
            "   return redis.call('del', @key) " +
            "else " +
            "   return 0 " +
            "end");

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

        public async Task<string?> AcquireLockAsync(string key, TimeSpan expiry)
        {
            var lockValue = Guid.NewGuid().ToString();

            // SET key value NX EX — only sets if key does NOT exist (atomic)
            bool acquired = await _db.StringSetAsync(key, lockValue, expiry, When.NotExists);

            return acquired ? lockValue : null;
        }

        public async Task<bool> ReleaseLockAsync(string key, string lockValue)
        {
            var result = await _db.ScriptEvaluateAsync(
                _releaseLockScript,
                new { key = (RedisKey)key, value = (RedisValue)lockValue });

            return (int)result == 1;
        }
    }
}
