using Fiebo.Application.DTOs.Wallet;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(string userId);
        Task<QrPaymentResponseDto> GenerateTopUpQrAsync(decimal amount, string userId);
        Task<bool> TopUpWalletAsync(SepayWebhookRequest request);
        Task<PagedResult<WalletTransactionResponse>> GetWalletTransactionsAsync
            (string userId, int pageNumber, int pageSize, DateTime? from, DateTime? to);
        Task<WithdrawResponse> WithdrawAsync(string userId, string userRole, WithdrawRequest request);
    }
}
