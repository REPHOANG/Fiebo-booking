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
    }
}
