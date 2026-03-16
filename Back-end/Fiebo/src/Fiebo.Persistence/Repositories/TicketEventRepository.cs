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
    public class TicketEventRepository : Repository<TicketEvent>, ITicketEventRepository
    {
        public TicketEventRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<TicketEvent?> GetDropInEventDetailAsync(int eventId)
        {
            return await _context.TicketEvents
                .AsNoTracking()
                .AsSplitQuery()
                .Include(te => te.Field)
                    .ThenInclude(f => f.Venue)
                        .ThenInclude(v => v.Province)
                .Include(te => te.Field)
                    .ThenInclude(f => f.Venue)
                        .ThenInclude(v => v.Ward)
                .Include(te => te.Slot)
                .FirstOrDefaultAsync(te => te.EventId == eventId);
        }
    }
}
