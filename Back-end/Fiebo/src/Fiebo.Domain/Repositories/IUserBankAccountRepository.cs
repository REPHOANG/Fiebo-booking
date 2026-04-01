using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IUserBankAccountRepository : IRepository<UserBankAccount>
    {
        Task<UserBankAccount?> GetByIdAndUserAsync(int bankAccountId, string userId);
    }
}
