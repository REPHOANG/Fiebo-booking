using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class WalletRepository : Repository<Wallet>, IWalletRepository
    {
        public WalletRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<Wallet?> GetByUserId(string userId)
        {
            return await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        }
    }
}
