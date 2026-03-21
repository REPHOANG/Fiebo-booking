using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class BookingCompleteJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingCompleteJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        public BookingCompleteJob(
            IServiceScopeFactory scopeFactory,
            ILogger<BookingCompleteJob> logger)
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
                    _logger.LogError(ex, "Error while completing bookings");
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

            var affected = await db.Bookings
                .Where(b => b.Status == BookingStatus.Booked)
                .Where(b =>
                    !b.BookingDetails.Any(d =>
                        b.BookingDate > today ||
                        (b.BookingDate == today &&
                         d.TimeSlot!.EndTime > currentTime)
                    )
                )
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(b => b.Status, BookingStatus.Completed),
                    token);

            if (affected > 0)
            {
                _logger.LogInformation("Completed {Count} bookings", affected);
            }
        }
    }
}