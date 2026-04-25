using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Domain.Shared;
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
        Task<List<DropInEventListItemResponse>> GetEventsByVenueIdAsync(int venueId);
        Task<int> CreateDropInEventAsync(CreateDropInEventRequest request, string userId);
        Task<int> JoinDropInEventAsync(JoinEventRequest request, int eventId, string userId);
        Task<TicketEventDetailResponse> GetDropInEventDetailAsync(int eventId);
        Task<TicketDetailResponse> GetTicketDetailAsync(int ticketId, string userId);
        Task MakeDropInPayment(int ticketId, string userId);
        Task UpdateDropInEventAsync(int eventId, UpdateEventRequest request, string ownerId);
        Task<OwnerTicketEventDetailResponse?> GetEventDetailForOwnerAsync(int eventId, string ownerId);
        //Task UpdateDropInEventAsync(int eventId, UpdateDropInEventRequest request, string ownerId);
        Task<List<OwnerDropInEventListItemResponse>> GetOwnerEventListAsync(string ownerId);
        Task<PagedResult<CustomerEventHistoryResponse>> GetCustomerEventHistoryAsync(string userId, EventHistoryFilter filter);
        Task<int> CancelDropInEventAsync(int eventId, string ownerId, string? cancelNote);
        Task CustomerCancelDropInEventAsync(int ticketId, string? userId);
        Task FinalizeEventsAsync(DateTime now);
    }
}
