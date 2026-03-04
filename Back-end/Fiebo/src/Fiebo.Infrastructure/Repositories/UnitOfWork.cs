using Fiebo.Domain.Entities;
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

        public IRepository<Wallet> Wallets { get; }
        public IVenueRepository Venues { get; }
        public IFieldRepository Fields { get; }

        public UnitOfWork(FieboDbContext context,
            IRepository<Wallet> walletRepository,
            IVenueRepository venueRepository,
            IFieldRepository fieldRepository
            )
        {
            _context = context;
            Wallets = walletRepository;
            Venues = venueRepository;
            Fields = fieldRepository;
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
