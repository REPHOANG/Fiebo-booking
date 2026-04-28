using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.FinanceAdmin;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IFinanceAdminService
    {
        Task<List<FinanceAdminListResponse>> GetFinanceAdminListAsync();
        Task<bool> CreateFinanceAdminAsync(CreateFinanceAdminRequest request);
        Task<PagedResult<PaymentTransactionResponse>> GetPaymentTransactionAsync(int page, int pageSize, TransactionFilter filter);
        Task<PaymentTransactionDetailResponse> GetPaymentTransactionDetailAsync(int id);
        Task<PagedResult<PayoutBatchResponse>> GetPayoutBatchesAsync(int page, int pageSize, int? year, int? month, string? status);
        Task<PagedResult<PayoutResponse>> GetPayoutsByBatchIdAsync(int batchId, int page, int pageSize, string? name, string? status);
        Task<PayoutDetailResponse> GetPayoutDetailAsync(int payoutId);
        Task<bool> StartProcessingPayoutBatchAsync(int batchId, string adminId);
        Task<bool> CompletePayoutBatchAsync(int batchId, string adminId);
    }
}
