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
        IRepository<Wallet> Wallets { get; }
        IBookingRepository Bookings { get; }

        IVenueRepository Venues { get; }

        IFieldRepository Fields { get; }

        IReviewRepository Reviews { get; }

        IBookingDetailRepository BookingDetails { get; }

        ISportTypeRepository SportTypes { get; }

        ITimeSlotRepository TimeSlots { get; }

        //IReportRepository Reports { get; }

        Task<int> SaveChangesAsync();
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}
