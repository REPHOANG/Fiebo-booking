using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;

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
                .Include(te => te.Details)       
                .ThenInclude(d => d.Field)           
                .ThenInclude(f => f.Venue)
                .ThenInclude(v => v!.Province)
                .Include(te => te.Details)
                .ThenInclude(d => d.Field)
                .ThenInclude(f => f.Venue)
                .ThenInclude(v => v!.Ward)
                .Include(te => te.Details)
                .ThenInclude(d => d.Slot)
                .FirstOrDefaultAsync(te => te.Id == eventId);
        }

        public async Task<List<TicketEvent>> GetPendingEventsAsync()
        {
            return await _context.TicketEvents
                .AsNoTracking()
                .AsSplitQuery()
                .Where(te => te.Status == TicketEventStatus.Pending)
                .Include(te => te.Details)
                    .ThenInclude(d => d.Field)
                        .ThenInclude(f => f.Venue)
                .Include(te => te.Details)
                    .ThenInclude(d => d.Slot)
                .Include(te => te.Participants)
                .OrderBy(te => te.EventDate)
                .ToListAsync();
        }

        public async Task<bool> IsSlotUsedByEventAsync(int fieldId, int slotId, DateOnly eventDate)
        {
            return await _context.Set<TicketEventDetail>()
                .AnyAsync(d =>
                    d.FieldId == fieldId &&
                    d.SlotId == slotId &&
                    d.Event.EventDate == eventDate &&
                    (d.Event.Status == TicketEventStatus.Pending || d.Event.Status == TicketEventStatus.Ongoing));
        }
    }
}
