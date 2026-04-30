using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IPayoutRepository : IRepository<Payout>
    {
        Task<PagedResult<Payout>> GetOwnerPayouts(string? ownerId, int page, int pageSize, int? year, int? month);
        Task<decimal> GetPendingPayoutAmountAsync(string ownerId);
        Task<Payout?> GetPayoutWithDetailsAsync(int payoutId);
        Task<PagedResult<Payout>> GetAdminPayoutsAsync(int page, int pageSize, PayoutStatus? status, int? year, int? month);
        Task<bool> StartProcessingPayoutAsync(int payoutId, string processedBy);
        Task<bool> MarkPayoutAsCompletedAsync(int payoutId, string processedBy);
        Task<bool> MarkPayoutAsFailedAsync(int payoutId, string processedBy, string failureReason);
        Task<PagedResult<PayoutResponse>> GetPayoutsByBatchIdAsync(int batchId, int page, int pageSize, string? name, PayoutStatus? status);
    }
}
