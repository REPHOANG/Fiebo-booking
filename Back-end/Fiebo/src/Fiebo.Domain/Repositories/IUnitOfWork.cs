using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IUnitOfWork : IDisposable
    {
        IProductRepository Products { get; }

        Task<int> SaveChangesAsync();
    }
}
