using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
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
        private IProductRepository? _productRepository;

        public UnitOfWork(FieboDbContext context)
        {
            _context = context;
        }

        // Singleton instance cho Repository trong phạm vi request
        public IProductRepository Products
        {
            get
            {
                // Nếu chưa có thì new, có rồi thì dùng lại (Lazy Loading pattern)
                return _productRepository ??= new ProductRepository(_context);
            }
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
