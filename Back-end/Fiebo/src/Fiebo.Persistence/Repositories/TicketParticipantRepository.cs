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
    public class TicketParticipantRepository : Repository<TicketParticipant>, ITicketParticipantRepository
    {
        public TicketParticipantRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<int> GetCurrentPlayer(int eventId)
        {
            return await _context.TicketParticipants
                .AsNoTracking()
                .Where(tp => tp.EventId == eventId)
                .SumAsync(tp => (int?)tp.TicketQuantity) ?? 0;
        }

        public async Task<TicketParticipant?> GetTicketDetailAsync(int participantId)
        {
            return await _context.TicketParticipants
                .AsNoTracking()
                .Include(tp => tp.Event)
                    .ThenInclude(te => te.Details)
                    .ThenInclude(d => d.Field)
                .Include(tp => tp.Event)
                .ThenInclude(te => te.Details)
                    .ThenInclude(d => d.Slot)
                .FirstOrDefaultAsync(tp => tp.Id == participantId);
        }
    }
}
