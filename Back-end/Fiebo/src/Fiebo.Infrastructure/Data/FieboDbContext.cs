using Fiebo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Data
{
    public class FieboDbContext : DbContext
    {
        public FieboDbContext(DbContextOptions<FieboDbContext> options) : base(options)
        {
        }

        // Khai báo các bảng (DbSet)
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Wallet> Wallets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Composite Key for UserRole
            modelBuilder.Entity<UserRole>()
                .HasKey(x => new { x.UserId, x.RoleId });

            // One - One: User - Wallet
            modelBuilder.Entity<User>()
                .HasOne(x => x.Wallet)
                .WithOne(x => x.User)
                .HasForeignKey<Wallet>(x => x.UserId);
        }
    }
}
