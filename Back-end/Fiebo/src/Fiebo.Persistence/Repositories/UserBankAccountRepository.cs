using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class UserBankAccountRepository : Repository<UserBankAccount>, IUserBankAccountRepository
    {
        public UserBankAccountRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<UserBankAccount?> GetByIdAndUserAsync(int bankAccountId, string userId)
        {
            return await _context.UserBankAccounts
                .FirstOrDefaultAsync(b => b.Id == bankAccountId && b.UserId == userId);
        }
    }
}
