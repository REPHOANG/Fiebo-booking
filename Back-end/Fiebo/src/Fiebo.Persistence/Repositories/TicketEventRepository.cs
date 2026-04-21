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
                .Where(te => te.Status == TicketEventStatus.Pending &&
                             te.Details.All(d => d.Field.Status == FieldStatus.Active &&
                                                 d.Field.Venue!.Status == VenueStatus.Active
                                                 && !d.Slot.IsDeleted))
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

        public async Task<TicketEvent?> GetEventDetailForOwnerAsync(int eventId, string ownerId)
        {
            return await _context.TicketEvents
                .AsNoTracking()
                .AsSplitQuery()
                .Include(e => e.Details)
                    .ThenInclude(d => d.Field)
                .Include(e => e.Details)
                    .ThenInclude(d => d.Slot)
                .Include(e => e.Participants)
                .FirstOrDefaultAsync(e => e.Id == eventId && e.OwnerId == ownerId);
        }
        public async Task<List<TicketEvent>> GetOwnerEventListAsync(string ownerId)
        {
            return await _context.TicketEvents
                .AsNoTracking()
                .AsSplitQuery()
                .Where(te => te.OwnerId == ownerId)
                .Include(te => te.Details)
                    .ThenInclude(d => d.Field)
                        .ThenInclude(f => f.Venue)
                .Include(te => te.Participants)
                .OrderByDescending(te => te.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<TicketEvent>> GetEventsByVenueIdAsync(int venueId)
        {
            return await _context.TicketEvents
                .AsNoTracking()
                .AsSplitQuery()
                .Where(te => te.Status == TicketEventStatus.Pending &&
                             te.Details.Any(d => d.Field.VenueId == venueId))
                .Include(te => te.Details)
                    .ThenInclude(d => d.Field)
                .Include(te => te.Details)
                    .ThenInclude(d => d.Slot)
                .Include(te => te.Participants)
                .OrderBy(te => te.EventDate)
                .ToListAsync();
        }

        public async Task<List<(int SlotId, int FieldId)>> GetUsedSlots(
            List<int> slotIds,
            List<int> fieldIds,
            DateOnly bookingDate)
        {
            return await _context.TicketEventDetails
                .AsNoTracking()
                .Where(d =>
                    slotIds.Contains(d.SlotId) &&
                    fieldIds.Contains(d.FieldId) &&
                    d.Event.EventDate == bookingDate &&
                    d.Event.Status == TicketEventStatus.Pending
                )
                .Select(d => new ValueTuple<int, int>(d.SlotId, d.FieldId))
                .Distinct()
                .ToListAsync();
        }
    }
}
