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

        public void AddClient(string userId, HttpResponse response)
        {
            if (!_clients.ContainsKey(userId))
                _clients[userId] = new List<HttpResponse>();

            _clients[userId].Add(response);
        }

        public async Task SendToUserAsync(string userId, string message)
        {
            if (!_clients.ContainsKey(userId)) return;

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
