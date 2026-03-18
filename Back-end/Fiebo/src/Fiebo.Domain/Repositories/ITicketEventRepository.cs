using Fiebo.Domain.Entities;
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
    }
}
