using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class TicketEventCompleteJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TicketEventCompleteJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        public TicketEventCompleteJob(
            IServiceScopeFactory scopeFactory,
            ILogger<TicketEventCompleteJob> logger)
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
                    await Run(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while setting events to completed");
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

            var eventIdsToComplete = await db.TicketEventDetails
                .Where(d => d.Event.Status == TicketEventStatus.Ongoing)
                .GroupBy(d => new { d.EventId, d.Event.EventDate })
                .Where(g =>
                    g.Key.EventDate < today ||
                    (g.Key.EventDate == today && g.Max(x => x.Slot.EndTime) <= currentTime))
                .Select(g => g.Key.EventId)
                .ToListAsync(token);

            if (eventIdsToComplete.Count == 0)
            {
                return;
            }

            var updated = await db.TicketEvents
                .Where(e => e.Status == TicketEventStatus.Ongoing && eventIdsToComplete.Contains(e.Id))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(e => e.Status, TicketEventStatus.Completed), token);

            if (updated > 0)
            {
                _logger.LogInformation("Set {Count} event(s) to Completed", updated);
            }
        }
    }
}