using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class PayoutRepository : Repository<Payout>, IPayoutRepository
    {
        public PayoutRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<decimal> GetPendingPayoutAmountAsync(string ownerId)
        {
            return await _context.Payouts
                .Where(p => p.Status == PayoutStatus.Pending)
                .Where(p => p.PayoutDetails.Any(pd => pd.Booking.Venue.OwnerId == ownerId))
                .SumAsync(p => p.Amount);
        }
    }
}
