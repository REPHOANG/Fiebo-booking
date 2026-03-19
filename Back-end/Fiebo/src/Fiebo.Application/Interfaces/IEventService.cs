using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IEventService
    {
        Task<List<DropInEventListItemResponse>> GetDropInEventListAsync();
        Task<int> CreateDropInEventAsync(CreateDropInEventRequest request, string userId);
        Task<int> JoinDropInEventAsync(JoinEventRequest request, int eventId, string userId);
        Task<TicketEventDetailResponse> GetDropInEventDetailAsync(int eventId);
        Task<TicketDetailResponse> GetTicketDetailAsync(int ticketId, string userId);
        Task MakeDropInPayment(int ticketId, string userId);
        Task<OwnerTicketEventDetailResponse?> GetEventDetailForOwnerAsync(int eventId, string ownerId);
        Task UpdateDropInEventAsync(int eventId, UpdateDropInEventRequest request, string ownerId);
    }
}
