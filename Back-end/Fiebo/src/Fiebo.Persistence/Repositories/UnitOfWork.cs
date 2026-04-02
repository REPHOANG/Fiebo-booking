using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore.Storage;
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
        private IDbContextTransaction? _transaction;

        public IWalletRepository Wallets { get; }
        public IBookingRepository Bookings { get; }
        public IVenueRepository Venues { get; }
        public IFieldRepository Fields { get; }
        public IReviewRepository Reviews { get; }
        public IBookingDetailRepository BookingDetails { get; }
        public ISportTypeRepository SportTypes { get; }
        public ITimeSlotRepository TimeSlots { get; }
        //public IReportRepository Reports { get; }
        public ITopUpRequestRepository TopUpRequests { get; }
        public IWalletTransactionRepository WalletTransactions { get; }

        public ITicketEventRepository TicketEvents { get; }

        public ITicketParticipantRepository TicketParticipants { get; }

        public ITicketEventDetailRepository TicketEventsDetails { get; }
        public IVenueStaffRepository VenueStaffs { get; }
        public IProvinceRepository Provinces { get; }
        public IWardRepository Wards { get; }
        public IVenueDocumentRepository VenueDocuments { get; }
        public IVenueDocumentImageRepository VenueDocumentImages { get; }
        public IFieldImageRepository FieldImages { get; }
        public IVenueServiceItemRepository VenueServiceItems { get; }
        public ISubscriptionPlanRepository SubscriptionPlans { get; }
        public IOwnerPlanRepository OwnerPlans { get; }
        public ICancelBookingRepository CancelBooking { get; }
        public IUserBankAccountRepository UserBankAccounts { get; }

        public UnitOfWork(FieboDbContext context,
            IWalletRepository walletRepository,
            IBookingRepository bookingRepository,
            IVenueRepository venueRepository,
            IFieldRepository fieldRepository,
            IReviewRepository reviewRepository,
            IBookingDetailRepository bookingDetailRepository,
            ISportTypeRepository sportTypeRepository,
            ITimeSlotRepository timeSlotRepository,
            ITopUpRequestRepository topUpRequestRepository,
            IWalletTransactionRepository walletTransactionRepository,
            ITicketEventRepository ticketEventRepository,
            ITicketParticipantRepository ticketParticipantRepository,
            ITicketEventDetailRepository ticketEventDetailRepository,
            IVenueStaffRepository venueStaffRepository,
            IProvinceRepository provinceRepository,
            IWardRepository wardRepository,
            IVenueDocumentRepository venueDocumentRepository,
            IVenueDocumentImageRepository venueDocumentImageRepository,
            IFieldImageRepository fieldImageRepository,
            IVenueServiceItemRepository venueServiceItemRepository,
            ISubscriptionPlanRepository subscriptionPlanRepository,
            IOwnerPlanRepository ownerPlanRepository,
            ICancelBookingRepository cancelBookingRepository,
            IUserBankAccountRepository userBankAccountRepository
            //IReportRepository reportRepository
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
            //Reports = reportRepository;
            TopUpRequests = topUpRequestRepository;
            WalletTransactions = walletTransactionRepository;
            TicketEvents = ticketEventRepository;
            TicketParticipants = ticketParticipantRepository;
            TicketEventsDetails = ticketEventDetailRepository;
            VenueStaffs = venueStaffRepository;
            Provinces = provinceRepository;
            Wards = wardRepository;
            VenueDocuments = venueDocumentRepository;
            VenueDocumentImages = venueDocumentImageRepository;
            FieldImages = fieldImageRepository;
            VenueServiceItems = venueServiceItemRepository;
            SubscriptionPlans = subscriptionPlanRepository;
            OwnerPlans = ownerPlanRepository;
            CancelBooking = cancelBookingRepository;
            UserBankAccounts = userBankAccountRepository;
        }


        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async Task BeginTransactionAsync()
        {
            _transaction = await _context.Database.BeginTransactionAsync();
        }

        public async Task CommitTransactionAsync()
        {
            if (_transaction is not null)
            {
                await _transaction.CommitAsync();
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }

        public async Task RollbackTransactionAsync()
        {
            if (_transaction is not null)
            {
                await _transaction.RollbackAsync();
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }

        public void Dispose()
        {
            _transaction?.Dispose();
            _context.Dispose();
        }
    }
}
