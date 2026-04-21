using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class TicketEventAutoCancelJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TicketEventAutoCancelJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
        private const int AutoCancelWindowHours = 6;

        public TicketEventAutoCancelJob(
            IServiceScopeFactory scopeFactory,
            ILogger<TicketEventAutoCancelJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("TicketEventAutoCancelJob started");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Run(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while auto-cancelling underfilled events");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task Run(CancellationToken token)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FieboDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var now = DateTime.Now;
            var limit = now.AddHours(AutoCancelWindowHours);
            var today = DateOnly.FromDateTime(now);
            var currentTime = TimeOnly.FromDateTime(now);
            var limitDate = DateOnly.FromDateTime(limit);
            var limitTime = TimeOnly.FromDateTime(limit);

            var eventIdsToCancel = await db.TicketEventDetails
                .Where(d => d.Event.Status == TicketEventStatus.Pending)
                .GroupBy(d => new { d.EventId, d.Event.EventDate, d.Event.MinPlayer })
                .Select(g => new
                {
                    g.Key.EventId,
                    g.Key.EventDate,
                    g.Key.MinPlayer,
                    EarliestStart = g.Min(x => x.Slot.StartTime),
                    JoinedPlayerCount = g.SelectMany(x => x.Event.Participants)
                        .Where(p => p.Status == TicketParticipantStatus.Joined)
                        .Sum(p => (int?)p.TicketQuantity) ?? 0
                })
                .Where(e =>
                    (e.EventDate > today || (e.EventDate == today && e.EarliestStart > currentTime)) &&
                    (e.EventDate < limitDate || (e.EventDate == limitDate && e.EarliestStart <= limitTime)) &&
                    e.JoinedPlayerCount < e.MinPlayer)
                .Select(e => e.EventId)
                .ToListAsync(token);

            if (eventIdsToCancel.Count == 0)
            {
                return;
            }

            var events = await db.TicketEvents
                .Where(e => eventIdsToCancel.Contains(e.Id) && e.Status == TicketEventStatus.Pending)
                .Include(e => e.Details)
                    .ThenInclude(d => d.Slot)
                .Include(e => e.Participants)
                .ToListAsync(token);

            var totalCancelledEvents = 0;
            var totalRefundedParticipants = 0;

            foreach (var ticketEvent in events)
            {
                try
                {
                    await using var transaction = await db.Database.BeginTransactionAsync(token);

                    var earliestStart = ticketEvent.Details
                        .OrderBy(d => d.Slot.StartTime)
                        .Select(d => d.Slot.StartTime)
                        .FirstOrDefault();

                    var eventStart = ticketEvent.EventDate.ToDateTime(earliestStart);
                    var joinedParticipants = ticketEvent.Participants
                        .Where(p => p.Status == TicketParticipantStatus.Joined)
                        .ToList();
                    var joinedPlayerCount = joinedParticipants.Sum(p => p.TicketQuantity);

                    if (eventStart <= now || eventStart > limit || joinedPlayerCount >= ticketEvent.MinPlayer)
                    {
                        await transaction.RollbackAsync(token);
                        continue;
                    }

                    var emailTargets = new List<(string Email, string Fullname, decimal RefundAmount)>();

                    if (joinedParticipants.Count > 0)
                    {
                        var joinedUserIds = joinedParticipants
                            .Select(p => p.UserId)
                            .Distinct()
                            .ToList();

                        var walletsByUser = await db.Wallets
                            .Where(w => joinedUserIds.Contains(w.UserId))
                            .ToDictionaryAsync(w => w.UserId, token);

                        var usersById = await db.Users
                            .Where(u => joinedUserIds.Contains(u.Id))
                            .ToDictionaryAsync(u => u.Id, token);

                        foreach (var participant in joinedParticipants)
                        {
                            if (!walletsByUser.TryGetValue(participant.UserId, out var wallet))
                            {
                                throw new InvalidOperationException($"Wallet not found for user {participant.UserId}");
                            }

                            wallet.Balance += participant.TotalPrice;

                            db.WalletTransactions.Add(new WalletTransaction
                            {
                                WalletId = wallet.Id,
                                TransactionType = TransactionType.Refund,
                                Direction = TransactionDirection.Credit,
                                Amount = participant.TotalPrice,
                                ReferenceId = ticketEvent.Id,
                                Description = "Tự động hoàn tiền cho sự kiện bị hủy do không đủ người tham gia"
                            });

                            if (usersById.TryGetValue(participant.UserId, out var user)
                                && !string.IsNullOrWhiteSpace(user.Email))
                            {
                                emailTargets.Add((
                                    user.Email!,
                                    participant.Fullname,
                                    participant.TotalPrice));
                            }
                        }
                    }

                    foreach (var participant in ticketEvent.Participants)
                    {
                        if (participant.Status != TicketParticipantStatus.Cancelled)
                        {
                            participant.Status = TicketParticipantStatus.Cancelled;
                        }
                    }

                    ticketEvent.Status = TicketEventStatus.Cancelled;

                    await db.SaveChangesAsync(token);
                    await transaction.CommitAsync(token);

                    totalCancelledEvents++;
                    totalRefundedParticipants += joinedParticipants.Count;

                    foreach (var emailTarget in emailTargets)
                    {
                        try
                        {
                            var subject = "Fiebo - Sự kiện đã bị hủy";
                            var body = $@"
                                <p>Xin chào {emailTarget.Fullname},</p>
                                <p>Sự kiện #{ticketEvent.Id} đã bị hủy vì không đủ số lượng người tham gia tối thiểu.</p>
                                <p>Số tiền hoàn: <strong>{emailTarget.RefundAmount:N0} VND</strong> đã được cộng vào ví của bạn.</p>
                                <p>Cảm ơn bạn đã sử dụng Fiebo.</p>";

                            await emailService.SendEmailAsync(emailTarget.Email, subject, body);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(
                                ex,
                                "Failed to send auto-cancellation email for event {EventId} to {Email}",
                                ticketEvent.Id,
                                emailTarget.Email);
                        }
                    }

                    _logger.LogInformation(
                        "Auto-cancelled event {EventId}: joined player(s) {JoinedCount}, min required {MinPlayer}",
                        ticketEvent.Id,
                        joinedPlayerCount,
                        ticketEvent.MinPlayer);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Failed to auto-cancel event {EventId}",
                        ticketEvent.Id);
                }
            }

            if (totalCancelledEvents > 0)
            {
                _logger.LogInformation(
                    "Auto-cancelled {EventCount} event(s); refunded {ParticipantCount} joined participant(s)",
                    totalCancelledEvents,
                    totalRefundedParticipants);
            }
        }
    }
}