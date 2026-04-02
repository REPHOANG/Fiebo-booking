using Fiebo.Domain.Entities;
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
    }
}
