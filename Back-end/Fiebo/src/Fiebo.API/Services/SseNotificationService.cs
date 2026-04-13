using Fiebo.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Fiebo.API.Services
{
    public class SseNotificationService : INotificationService
    {
        private readonly SseService _sseService;

        public SseNotificationService(SseService sseService)
        {
            _sseService = sseService;
        }

        public async Task NotifyWalletTopupAsync(string userId, decimal amount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "wallet_topup",
                amount
            });

            await _sseService.SendToUserAsync(userId, payload);
        }

        public async Task NotifyBookingCancelledByOwnerAsync(string userId, int bookingId, string reason, decimal refundAmount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "booking_cancelled_by_owner",
                bookingId,
                reason,
                refundAmount
            });

            await _sseService.SendToUserAsync(userId, payload);
        }

        public async Task NotifyEventCancelledByOwnerAsync(string userId, int eventId, string eventName, string? cancelNote, decimal refundAmount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "event_cancelled_by_owner",
                eventId,
                eventName,
                cancelNote,
                refundAmount
            });

            await _sseService.SendToUserAsync(userId, payload);
        }
    }
}
