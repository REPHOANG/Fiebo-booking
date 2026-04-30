using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.API.Services
{
    public class SseService
    {
        private readonly Dictionary<string, List<HttpResponse>> _clients = new();
        private readonly ILogger<SseService> _logger;

        public SseService(ILogger<SseService> logger)
        {
            _logger = logger;
        }

        public void AddClient(string userId, HttpResponse response)
        {
            if (!_clients.ContainsKey(userId))
                _clients[userId] = new List<HttpResponse>();

            _clients[userId].Add(response);
            _logger.LogInformation($"Client connected: {userId}");
            _logger.LogInformation($"Total users connected: {_clients.Count}");
        }

        public async Task SendToUserAsync(string userId, string message)
        {
            _logger.LogInformation($"Send event to user: {userId}");
            _logger.LogInformation($"Connected users: {string.Join(",", _clients.Keys)}");
            if (!_clients.ContainsKey(userId))
            {
                _logger.LogWarning("User not connected to SSE");
                return;
            }

            var clients = _clients[userId];

            foreach (var client in clients.ToList())
            {
                try
                {
                    await client.WriteAsync($"data: {message}\n\n");
                    await client.Body.FlushAsync();
                }
                catch
                {
                    clients.Remove(client);
                }
            }
        }
    }
}
