using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface INotificationService
    {
        Task NotifyWalletTopupAsync(string userId, decimal amount);
        Task NotifyBookingCancelledByOwnerAsync(string userId, int bookingId, string reason, decimal refundAmount);
        Task NotifyEventCancelledByOwnerAsync(string userId, int eventId, string eventName, string? cancelNote, decimal refundAmount);
        Task NotifyVenueApprovedAsync(string ownerId, int venueId, string venueName);
        Task NotifyVenueRejectedAsync(string ownerId, int venueId, string venueName, string reason);
        Task NotifyOwnerNewBookingPendingAsync(string ownerId, int bookingId);
        Task NotifyBookingConfirmedAsync(string userId, int bookingId);
        Task NotifyBookingRejectedAsync(string userId, int bookingId, string reason, decimal refundAmount);
        Task NotifyVenueUpdateRejectedAsync(string ownerId, int venueId, string venueName, string adminNote);
    }
}
