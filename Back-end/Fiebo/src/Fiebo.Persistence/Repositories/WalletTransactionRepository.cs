using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using static NetTopologySuite.Geometries.Implementation.PackedCoordinateSequenceFactory;
using static System.Net.WebRequestMethods;


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

        public async Task<PagedResult<PaymentTransactionResponse>> GetPaymentTransaction(
    int page, int pageSize,
    DateTime? from, DateTime? to,
    TransactionType? type,
    string? name,
    TransactionStatus? status)
        {
            var query = from t in _context.WalletTransactions
                        join w in _context.Wallets on t.WalletId equals w.Id
                        join u in _context.Users on w.UserId equals u.Id
                        select new
                        {
                            t,
                            UserId = u.Id,
                            UserName = u.FullName
                        };

            // Filter
            if (type != null)
                query = query.Where(x => x.t.TransactionType == type);

            if (status != null)
                query = query.Where(x => x.t.Status == status);

            if (from != null)
            {
                var fromDate = from.Value.Date;
                query = query.Where(x => x.t.CreatedAt >= fromDate);
            }

            if (to != null)
            {
                var toDate = to.Value.Date.AddDays(1);
                query = query.Where(x => x.t.CreatedAt < toDate);
            }

            if (!string.IsNullOrEmpty(name))
            {
                query = query.Where(x =>
                    x.UserName != null && x.UserName.Contains(name));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new PaymentTransactionResponse
                {
                    Id = x.t.Id,
                    UserId = x.UserId,
                    UserName = x.UserName ?? string.Empty,
                    Amount = x.t.Amount,
                    Direction = x.t.Direction.ToString(),
                    TransactionType = x.t.TransactionType.ToString(),
                    ReferenceId = x.t.ReferenceId,
                    Status = x.t.Status.ToString(),
                    Description = x.t.Description,
                    CreatedAt = x.t.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<PaymentTransactionResponse>
            {
                Items = items,
                TotalItems = total,
                Page = page,
                PageSize = pageSize
            };
        }
    }
}
