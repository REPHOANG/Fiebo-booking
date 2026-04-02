using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;


namespace Fiebo.Persistence.Repositories
{
    public class WalletTransactionRepository : Repository<WalletTransaction>, IWalletTransactionRepository
    {
        public WalletTransactionRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<PagedResult<WalletTransaction>> GetTransactionsByWalletIdAsync(int walletId, int page, int pageSize, DateTime from, DateTime to)
        {
            var query = _context.WalletTransactions
                .AsNoTracking()
                .Where(t => t.WalletId == walletId
                && t.CreatedAt >= from
                && t.CreatedAt < to);

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return new PagedResult<WalletTransaction>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems
            };
        }
        public async Task<bool> HasPendingWithdrawalAsync(int walletId)
        {
            return await _context.WalletTransactions
                .AnyAsync(t => t.WalletId == walletId
                    && t.TransactionType == Domain.Enums.TransactionType.Withdraw
                    && t.Status == Domain.Enums.TransactionStatus.Pending);
        }
    }
}
