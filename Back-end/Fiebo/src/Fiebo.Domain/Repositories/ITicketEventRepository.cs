using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface ITicketEventRepository : IRepository<TicketEvent>
    {
        Task<TicketEvent?> GetDropInEventDetailAsync(int eventId);
        Task<List<TicketEvent>> GetPendingEventsAsync();
        Task<bool> IsSlotUsedByEventAsync(int fieldId, int slotId, DateOnly eventDate);
        Task<TicketEvent?> GetEventDetailForOwnerAsync(int eventId);
        Task<List<TicketEvent>> GetOwnerEventListAsync(string ownerId);
        Task<List<TicketEvent>> GetEventsByVenueIdAsync(int venueId);
        Task<List<(int SlotId, int FieldId)>> GetUsedSlots(
            List<int> slotIds,
            List<int> fieldIds,
            DateOnly bookingDate);
        Task<PagedResult<TicketEvent>> GetEventsByVenueIdsAsync(List<int> venueIds, int page, int pageSize);
        Task<TicketEvent?> GetEventDetailForStaff(int eventId);
    }
}
