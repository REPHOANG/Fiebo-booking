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
    public class UnitOfWork : IUnitOfWork
    {
        private readonly FieboDbContext _context;

        // Khai báo field backing
        public IUserRepository Users { get; }

        public IRoleRepository Roles { get; }

        public IUserRoleRepository UserRoles { get; }

        public UnitOfWork(
            FieboDbContext context,
            IUserRepository users,
            IRoleRepository roles,
            IUserRoleRepository userRoles
            )
        {
            _context = context;
            Users = users;
            Roles = roles;
            UserRoles = userRoles;
        }

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

    }
}
