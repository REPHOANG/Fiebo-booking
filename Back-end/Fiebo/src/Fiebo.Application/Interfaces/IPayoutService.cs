using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IPayoutService
    {
        /// <summary>
        /// Processes a payout to the user's bank account.
        /// Returns true if the payout was successfully queued/processed.
        /// </summary>
        Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName);
    }
}
using Fiebo.Application.DTOs.Payout;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IPayoutService
    {
        Task<PagedResult<OwnerPayoutsResponse>> GetOwnerPayoutsAsync(string? ownerId, int page, int pageSize);
    }
}
