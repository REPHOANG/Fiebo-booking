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

        IVenueRepository Venues { get; }

        IFieldRepository Fields { get; }

        IReviewRepository Reviews { get; }

        IBookingDetailRepository BookingDetails { get; }

        Task<int> SaveChangesAsync();
    }
}
