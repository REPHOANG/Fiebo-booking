using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IUnitOfWork : IDisposable
    {
        IAdminDashboardRepository AdminDashboard { get; }
        IWalletRepository Wallets { get; }
        IBookingRepository Bookings { get; }

        IVenueRepository Venues { get; }

        IFieldRepository Fields { get; }

        IReviewRepository Reviews { get; }

        IBookingDetailRepository BookingDetails { get; }

        ISportTypeRepository SportTypes { get; }

        ITimeSlotRepository TimeSlots { get; }
        ITopUpRequestRepository TopUpRequests { get; }

        //IReportRepository Reports { get; }
        IWalletTransactionRepository WalletTransactions { get; }
        ITicketEventRepository TicketEvents { get; }
        ITicketParticipantRepository TicketParticipants { get; }
        ITicketEventDetailRepository TicketEventsDetails { get; }
        IVenueStaffRepository VenueStaffs { get; }
        IProvinceRepository Provinces { get; }
        IWardRepository Wards { get; }
        IVenueDocumentRepository VenueDocuments { get; }
        IVenueDocumentImageRepository VenueDocumentImages { get; }
        IFieldImageRepository FieldImages { get; }
        IVenueServiceItemRepository VenueServiceItems { get; }
        ISubscriptionPlanRepository SubscriptionPlans { get; }
        IOwnerPlanRepository OwnerPlans { get; }
        ISubscriptionTransactionRepository SubscriptionTransactions { get; }
        ICancelBookingRepository CancelBooking { get; }
        IUserBankAccountRepository UserBankAccounts { get; }
        IPayoutRepository Payouts { get; }
        IAdminRepository Admins { get; }
        IPayoutBatchRepository PayoutBatches { get; }
        IPayoutDetailRepository PayoutDetails { get; }
        IRepository<BookingServiceItem> BookingServiceItems { get; }
        Task<int> SaveChangesAsync();
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}
