using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Repositories
{
    public class UserRepository : Repository<User>, IUserRepository
    {
        private readonly FieboDbContext _context;
        public UserRepository(FieboDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if(user == null)
            {
                return null;
            }
            return user;
        }

        public async Task<User?> GetByPhoneAsync(string phone)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
            if(user == null)
            {
                return null;
            }
            return user;
        }
    }
}
