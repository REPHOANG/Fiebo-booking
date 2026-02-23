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
    public class UnitOfWork : IUnitOfWork
    {
        private readonly FieboDbContext _context;
        //private IProductRepository? _productRepository;
        private IRepository<Wallet>? _walletRepository;

        public UnitOfWork(
            FieboDbContext context,
            IUserRepository users
            )
        {
            _context = context;
        }
        //public IProductRepository Products => _productRepository ??= new ProductRepository(_context);
        public IRepository<Wallet> Wallets => _walletRepository ??= new Repository<Wallet>(_context);

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
