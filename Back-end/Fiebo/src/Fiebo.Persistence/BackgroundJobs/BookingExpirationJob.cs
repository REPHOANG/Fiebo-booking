using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    /// <summary>
    /// Background job that runs every 1 minutes to auto-expire
    /// Pending bookings that have passed their ExpiredAt deadline.
    /// </summary>
    public class BookingExpirationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingExpirationJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(1);

        public BookingExpirationJob(
            IServiceScopeFactory scopeFactory,
            ILogger<BookingExpirationJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingExpirationJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ExpirePendingBookingsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while expiring pending bookings.");
                }

                await Task.Delay(Interval, stoppingToken);
            }

            _logger.LogInformation("BookingExpirationJob stopped.");
        }

        private async Task ExpirePendingBookingsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FieboDbContext>();

            var now = DateTime.Now;

            var expiredCount = await context.Bookings
                .Where(b =>
                    b.Status == BookingStatus.Pending &&
                    b.ExpiredAt.HasValue &&
                    b.ExpiredAt.Value < now)
                .ExecuteUpdateAsync(
                    b => b.SetProperty(x => x.Status, BookingStatus.Expired)
                          .SetProperty(x => x.UpdatedAt, now),
                    cancellationToken);

            if (expiredCount > 0)
            {
                _logger.LogInformation("Auto-expired {Count} pending booking(s).", expiredCount);
            }
        }
    }
}
