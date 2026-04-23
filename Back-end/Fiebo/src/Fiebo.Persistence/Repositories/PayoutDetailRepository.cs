using Fiebo.Domain.Entities;
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
    public class PayoutDetailRepository : Repository<PayoutDetail>, IPayoutDetailRepository
    {
        public PayoutDetailRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<PayoutDetail>> GetPayoutDetailByIdAsync(int id)
        {
            return await _context.PayoutDetails.Where(pd => pd.PayoutId == id)
                .Include(pd => pd.Booking)
                .ThenInclude(b => b.Venue)
                .Include(pd => pd.Event)
                .ToListAsync();
        }
    }
}
