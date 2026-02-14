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
    public class RoleRepository : Repository<Role>, IRoleRepository
    {
        public RoleRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<Role?> GetByRoleNameAsync(string role)
        {
            return await _context.Roles.FirstOrDefaultAsync(r => r.Name == role);
        }
    }
}
