using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;


namespace Fiebo.Persistence.Repositories
{
    public class WalletTransactionRepository : Repository<WalletTransaction>, IWalletTransactionRepository
    {
        public WalletTransactionRepository(FieboDbContext context) : base(context)
        {
        }
    }
}
