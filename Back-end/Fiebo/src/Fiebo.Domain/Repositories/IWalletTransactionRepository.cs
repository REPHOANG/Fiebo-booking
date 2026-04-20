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
    public interface IWalletTransactionRepository : IRepository<WalletTransaction>
    {
        Task<PagedResult<WalletTransaction>> GetTransactionsByWalletIdAsync(int walletId, int pageNumber, int pageSize, DateTime from, DateTime to);
        Task<bool> HasPendingWithdrawalAsync(int walletId);
        Task<PagedResult<WalletTransaction>> GetAdminWithdrawRequestsAsync(int page, int pageSize, TransactionStatus? status);
        Task<WalletTransaction?> GetWithdrawRequestDetailAsync(int transactionId);
    }
}
