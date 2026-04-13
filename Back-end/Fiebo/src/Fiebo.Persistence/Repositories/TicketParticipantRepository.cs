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

        public async Task<List<TicketParticipant>> GetJoinedParticipantsByEventIdAsync(int eventId)
        {
            return await _context.TicketParticipants
                .Where(tp => tp.EventId == eventId && tp.Status == TicketParticipantStatus.Joined)
                .ToListAsync();
        }

        public async Task<(List<TicketParticipant> Items, int TotalCount)> GetCustomerEventHistoryAsync(
            string userId,
            int pageIndex,
            int pageSize)
        {
            var baseQuery = _context.TicketParticipants
                .Where(tp => tp.UserId == userId);

            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .AsNoTracking()
                .AsSplitQuery()
                .Include(tp => tp.Event)
                    .ThenInclude(e => e.Details)
                        .ThenInclude(d => d.Field)
                            .ThenInclude(f => f.Venue)
                .Include(tp => tp.Event)
                    .ThenInclude(e => e.Details)
                        .ThenInclude(d => d.Slot)
                .OrderByDescending(tp => tp.Id)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }
    }
}
