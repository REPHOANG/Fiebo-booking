using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Domain.Enums;
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
        Task<OwnerPayoutListResponse> GetOwnerPayoutsAsync(string? ownerId, int page, int pageSize, int? year, int? month);
        Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName);
        Task<DetailedPayoutResponse> GetPayoutDetailAsync(int payoutId, string ownerId);
        Task<PagedResult<AdminPayoutListResponse>> GetAdminPayoutsAsync(int page, int pageSize, PayoutStatus? status, int? year, int? month);
        Task<bool> MarkPayoutAsCompletedAsync(int payoutId, string adminId);
        Task<PagedResult<AdminWithdrawRequestListItem>> GetAdminWithdrawRequestsAsync(int page, int pageSize, TransactionStatus? status);
        Task<AdminWithdrawRequestDetail> GetAdminWithdrawRequestDetailAsync(int transactionId);
        Task<bool> CompleteWithdrawRequestAsync(int transactionId, string adminId);
        Task<bool> RejectWithdrawRequestAsync(int transactionId, string adminId, string rejectionReason);
    }
}
