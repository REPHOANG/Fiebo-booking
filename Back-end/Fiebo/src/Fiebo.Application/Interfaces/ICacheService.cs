using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ICacheService
    {
        Task SetAsync(string key, string value, TimeSpan expiration);
        Task<string?> GetAsync(string key);
        Task RemoveAsync(string key);

        /// <summary>
        /// Acquires a distributed lock on the given key.
        /// Returns a unique lockValue (GUID) if acquired successfully, or null if the lock is already held.
        /// </summary>
        Task<string?> AcquireLockAsync(string key, TimeSpan expiry);

        /// <summary>
        /// Releases a distributed lock only if the current holder matches the lockValue.
        /// </summary>
        Task<bool> ReleaseLockAsync(string key, string lockValue);
    }
}
