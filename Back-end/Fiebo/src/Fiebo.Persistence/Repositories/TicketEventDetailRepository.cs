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
    public class TicketEventDetailRepository : Repository<TicketEventDetail>, ITicketEventDetailRepository
    {
        public TicketEventDetailRepository(FieboDbContext context) : base(context)
        {
        }
        public async Task<TicketEventDetail?> GetEarliestDetailAsync(int eventId)
        {
            return await _context.TicketEventDetails
                .Where(d => d.EventId == eventId)
                .Include(d => d.Slot)
                .OrderBy(d => d.Slot.StartTime)
                .FirstOrDefaultAsync();
        }
    }
}
