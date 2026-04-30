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
        Task<int> GenerateTopUpQrAsync(decimal amount, string? userId);
        Task<QrPaymentResponseDto>  GetTopUpRequest(int topUpId, string? userId);
        Task<bool> TopUpWalletAsync(SepayWebhookRequest request);
        Task<PagedResult<WalletTransactionResponse>> GetWalletTransactionsAsync
            (string userId, int pageNumber, int pageSize, DateTime? from, DateTime? to);
        Task<WithdrawResponse> WithdrawAsync(string userId, string userRole, WithdrawRequest request);

        // UserBankAccount CRUD
        Task<IEnumerable<BankAccountResponse>> GetUserBankAccountsAsync(string userId);
        Task<BankAccountResponse> CreateBankAccountAsync(string userId, CreateBankAccountRequest request);
        Task UpdateBankAccountAsync(string userId, int id, UpdateBankAccountRequest request);
        Task DeleteBankAccountAsync(string userId, int id);
    }
}
