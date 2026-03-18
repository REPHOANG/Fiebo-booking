using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class TicketExpireJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TicketExpireJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

        public TicketExpireJob(IServiceScopeFactory scopeFactory, ILogger<TicketExpireJob> logger)
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
                    _logger.LogError(ex, "Error while deleting expired tickets");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task Run(CancellationToken token)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FieboDbContext>();

            var now = DateTime.Now;

            var deleted = await db.TicketParticipants
                .Where(t => t.Status == TicketParticipantStatus.Pending
                         && t.ExpiredAt <= now)
                .ExecuteDeleteAsync(token);

            if (deleted > 0)
            {
                _logger.LogInformation("Deleted {Count} expired tickets", deleted);
            }
        }
    }
}
