using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    /// <summary>
    /// Background job chạy mỗi 1 phút để tự động từ chối (Rejected) các Booking
    /// có Status=Pending mà chủ sân chưa confirm trong thời hạn (ConfirmExpiredAt).
    /// Sau khi từ chối, hoàn tiền về ví khách hàng.
    /// </summary>
    public class BookingConfirmExpirationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingConfirmExpirationJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

        public BookingConfirmExpirationJob(
            IServiceScopeFactory scopeFactory,
            ILogger<BookingConfirmExpirationJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingConfirmExpirationJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredPendingBookingsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing expired pending bookings.");
                }

                await Task.Delay(Interval, stoppingToken);
            }

            _logger.LogInformation("BookingConfirmExpirationJob stopped.");
        }

        private async Task ProcessExpiredPendingBookingsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FieboDbContext>();

            var now = DateTime.Now;

            // Lấy các Booking đang chờ confirm nhưng đã quá hạn
            var expiredBookings = await context.Bookings
                .Where(b =>
                    b.Status == BookingStatus.Pending &&
                    b.ConfirmExpiredAt.HasValue &&
                    b.ConfirmExpiredAt.Value <= now)
                .Include(b => b.Venue)
                .ToListAsync(cancellationToken);

            if (expiredBookings.Count == 0) return;

            var expiredIds = expiredBookings.Select(b => b.Id).ToList();

            // Xử lý hoàn tiền cho từng booking
            foreach (var booking in expiredBookings)
            {
                if (booking.TotalPrice > 0 && !string.IsNullOrEmpty(booking.UserId))
                {
                    var wallet = await context.Wallets
                        .FirstOrDefaultAsync(w => w.UserId == booking.UserId, cancellationToken);

                    if (wallet != null)
                    {
                        wallet.Balance += booking.TotalPrice;
                        context.Wallets.Update(wallet);

                        context.WalletTransactions.Add(new WalletTransaction
                        {
                            WalletId = wallet.Id,
                            TransactionType = TransactionType.Refund,
                            Direction = TransactionDirection.Credit,
                            Amount = booking.TotalPrice,
                            ReferenceId = booking.Id
                        });

                        context.CancelBookings.Add(new CancelBooking
                        {
                            BookingId = booking.Id,
                            CancelReason = "Chủ sân không xác nhận trong thời hạn quy định.",
                            RefundAmount = booking.TotalPrice
                        });
                    }
                }

                booking.Status = BookingStatus.Rejected;
                booking.ConfirmExpiredAt = null;
                booking.UpdatedAt = DateTime.Now;
                context.Bookings.Update(booking);
            }

            await context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Auto-rejected {Count} booking(s) due to confirm timeout.",
                expiredBookings.Count);
        }
    }
}
