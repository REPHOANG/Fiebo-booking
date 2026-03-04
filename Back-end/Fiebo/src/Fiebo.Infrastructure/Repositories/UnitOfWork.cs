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
        public IReviewRepository Reviews { get; }
        public IBookingDetailRepository BookingDetails { get; }

        public UnitOfWork(FieboDbContext context,
            IRepository<Wallet> walletRepository,
            IVenueRepository venueRepository,
            IFieldRepository fieldRepository,
            IReviewRepository reviewRepository,
            IBookingDetailRepository bookingDetailRepository
            )
        {
            _context = context;
            Wallets = walletRepository;
            Venues = venueRepository;
            Fields = fieldRepository;
            Reviews = reviewRepository;
            BookingDetails = bookingDetailRepository;
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
