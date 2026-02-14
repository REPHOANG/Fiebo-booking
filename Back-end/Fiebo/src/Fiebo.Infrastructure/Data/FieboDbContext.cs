using Fiebo.Domain.Entities;
using Fiebo.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Data
{
    public class FieboDbContext : IdentityDbContext<ApplicationUser>
    {
        public FieboDbContext(DbContextOptions<FieboDbContext> options) : base(options)
        {
        }

        // Khai báo các bảng (DbSet)

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

        }
    }
}
