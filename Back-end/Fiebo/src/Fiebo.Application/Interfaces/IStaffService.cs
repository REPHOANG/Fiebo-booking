using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Owner;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IStaffService
    {
        Task<List<OwnerStaffListResponse>> GetOwnerStaffListAsync(string ownerId);
        Task<bool> CreateStaffAsync(string ownerId, OwnerCreateStaffRequest request);
        Task<bool> ChangeStaffStatusAsync(string ownerId, string staffId);
        Task<List<OwnerVenueListResponse>> GetAssignedVenuesAsync(string? staffId);
        Task<PagedResult<OwnerBookingListResponse>> GetStaffBookingsAsync(string? staffId, OwnerBookingHistoryFilter param);
        Task<PagedResult<OwnerDropInEventListItemResponse>> GetStaffEventsAsync(string? staffId, int page, int pageSize);
        Task<OwnerTicketEventDetailResponse> GetEventDetailsAsync(string? staffId, int eventId);
        Task<OwnerBookingDetailResponse> GetBookingDetailAsync(string? staffId, int bookingId);
    }
}
