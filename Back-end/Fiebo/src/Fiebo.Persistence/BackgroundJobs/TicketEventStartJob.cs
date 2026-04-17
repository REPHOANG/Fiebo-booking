using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class TicketEventStartJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TicketEventStartJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        public TicketEventStartJob(
            IServiceScopeFactory scopeFactory,
            ILogger<TicketEventStartJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("");
                    await Run(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while setting events to ongoing");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task Run(CancellationToken token)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FieboDbContext>();

            var now = DateTime.Now;
            var today = DateOnly.FromDateTime(now);
            var currentTime = TimeOnly.FromDateTime(now);

            var eventIdsToStart = await db.TicketEventDetails
                .Where(d => d.Event.Status == TicketEventStatus.Pending)
                .GroupBy(d => new { d.EventId, d.Event.EventDate })
                .Where(g =>
                    g.Key.EventDate < today ||
                    (g.Key.EventDate == today && g.Min(x => x.Slot.StartTime) <= currentTime))
                .Select(g => g.Key.EventId)
                .ToListAsync(token);

            if (eventIdsToStart.Count == 0)
            {
                return;
            }

            var updated = await db.TicketEvents
                .Where(e => e.Status == TicketEventStatus.Pending && eventIdsToStart.Contains(e.Id))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(e => e.Status, TicketEventStatus.Ongoing), token);

            if (updated > 0)
            {
                _logger.LogInformation("Set {Count} event(s) to Ongoing", updated);
            }
        }
    }
}