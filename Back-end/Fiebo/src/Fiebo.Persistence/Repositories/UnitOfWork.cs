using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly FieboDbContext _context;

        public IRepository<Wallet> Wallets { get; }
        public IBookingRepository Bookings { get; }
        public IVenueRepository Venues { get; }
        public IFieldRepository Fields { get; }
        public IReviewRepository Reviews { get; }
        public IBookingDetailRepository BookingDetails { get; }
        public ISportTypeRepository SportTypes { get; }
        public ITimeSlotRepository TimeSlots { get; }
        public IReportRepository Reports { get; }

        public UnitOfWork(FieboDbContext context,
            IRepository<Wallet> walletRepository,
            IBookingRepository bookingRepository,
            IVenueRepository venueRepository,
            IFieldRepository fieldRepository,
            IReviewRepository reviewRepository,
            IBookingDetailRepository bookingDetailRepository,
            ISportTypeRepository sportTypeRepository,
            ITimeSlotRepository timeSlotRepository,
            IReportRepository reportRepository
            )
        {
            _context = context;
            Wallets = walletRepository;
            Bookings = bookingRepository;
            Venues = venueRepository;
            Fields = fieldRepository;
            Reviews = reviewRepository;
            BookingDetails = bookingDetailRepository;
            SportTypes = sportTypeRepository;
            TimeSlots = timeSlotRepository;
            Reports = reportRepository;
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
