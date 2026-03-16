using Fiebo.Application.DTOs.Event;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IEventService
    {
        Task<bool> JoinDropInEventAsync(JoinEventRequest request, int eventId, string userId);
        Task<TicketEventDetailResponse> GetDropInEventDetailAsync(int eventId);
    }
}
