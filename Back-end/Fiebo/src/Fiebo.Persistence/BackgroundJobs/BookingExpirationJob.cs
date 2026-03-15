using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    /// <summary>
    /// Background job that runs every 1 minute to delete
    /// Pending bookings that have passed their ExpiredAt deadline,
    /// along with their associated BookingDetail records.
    /// </summary>
    public class BookingExpirationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingExpirationJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

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
                    await DeleteExpiredBookingsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while deleting expired bookings.");
                }

                await Task.Delay(Interval, stoppingToken);
            }

            _logger.LogInformation("BookingExpirationJob stopped.");
        }

        private async Task DeleteExpiredBookingsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FieboDbContext>();

            var now = DateTime.Now;

            // Get IDs of expired pending bookings
            var expiredBookingIds = await context.Bookings
                .Where(b =>
                    b.Status == BookingStatus.Pending &&
                    b.ExpiredAt.HasValue &&
                    b.ExpiredAt.Value < now)
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);

            if (expiredBookingIds.Count == 0) return;

            // 1. Delete BookingDetails first (child records)
            var deletedDetails = await context.BookingDetails
                .Where(bd => expiredBookingIds.Contains(bd.BookingId))
                .ExecuteDeleteAsync(cancellationToken);

            // 2. Delete Bookings (parent records)
            var deletedBookings = await context.Bookings
                .Where(b => expiredBookingIds.Contains(b.Id))
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation(
                "Deleted {BookingCount} expired booking(s) and {DetailCount} booking detail(s).",
                deletedBookings, deletedDetails);
        }
    }
}
