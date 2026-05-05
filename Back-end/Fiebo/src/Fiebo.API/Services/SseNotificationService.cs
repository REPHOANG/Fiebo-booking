using Fiebo.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Fiebo.API.Services
{
    public class SseNotificationService : INotificationService
    {
        private readonly SseService _sseService;
        private readonly IEmailService _emailService;
        private readonly IIdentityService _identityService;
        private readonly ILogger<SseNotificationService> _logger;

        public SseNotificationService(
            SseService sseService, 
            IEmailService emailService, 
            IIdentityService identityService,
            ILogger<SseNotificationService> logger)
        {
            _sseService = sseService;
            _emailService = emailService;
            _identityService = identityService;
            _logger = logger;
        }

        public async Task NotifyWalletTopupAsync(string userId, decimal amount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "wallet_topup",
                amount
            });

            await _sseService.SendToUserAsync(userId, payload);
        }

        public async Task NotifyBookingCancelledByOwnerAsync(string userId, int bookingId, string reason, decimal refundAmount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "booking_cancelled_by_owner",
                bookingId,
                reason,
                refundAmount
            });

            await _sseService.SendToUserAsync(userId, payload);

            // Send Email Notification
            try
            {
                var user = await _identityService.GetUserProfileAsync(userId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Thông báo hủy đơn đặt sân";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #d9534f; text-align: center;'>Đơn đặt sân đã bị hủy</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Quý khách"}</strong>,</p>
                            <p>Chúng tôi rất tiếc phải thông báo rằng đơn đặt sân <strong>#{bookingId}</strong> của bạn đã bị hủy bởi chủ sân.</p>
                            <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;'>
                                <p><strong>Lý do hủy:</strong> {reason}</p>
                                <p><strong>Số tiền hoàn lại:</strong> <span style='color: #28a745; font-weight: bold;'>{refundAmount:N0} VND</span></p>
                            </div>
                            <p>Số tiền trên đã được hoàn trả lại vào ví <strong>Fiebo Wallet</strong> của bạn. Bạn có thể sử dụng số dư này cho các lần đặt sân tiếp theo.</p>
                            <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với bộ phận chăm sóc khách hàng của Fiebo.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";

                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the SSE notification
                Console.WriteLine($"Failed to send cancellation email to user {userId}: {ex.Message}");
            }
        }

        public async Task NotifyEventCancelledByOwnerAsync(string userId, int eventId, string eventName, string? cancelNote, decimal refundAmount)
        {
            await NotifyMultipleEventCancelledByOwnerAsync(new List<(string userId, decimal refundAmount)> { (userId, refundAmount) }, eventId, eventName, cancelNote);
        }

        public async Task NotifyMultipleEventCancelledByOwnerAsync(List<(string userId, decimal refundAmount)> participants, int eventId, string eventName, string? cancelNote)
        {
            var emailTasks = new List<(string To, string Subject, string Body)>();

            foreach (var participant in participants)
            {
                // 1. SSE Notification
                try
                {
                    var payload = JsonSerializer.Serialize(new
                    {
                        type = "event_cancelled_by_owner",
                        eventId,
                        eventName,
                        cancelNote,
                        refundAmount = participant.refundAmount
                    });
                    await _sseService.SendToUserAsync(participant.userId, payload);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send SSE notification to user {UserId} for event {EventId}", participant.userId, eventId);
                }

                // 2. Prepare Email Data
                try
                {
                    var user = await _identityService.GetUserProfileAsync(participant.userId);
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        string subject = $"Fiebo - Thông báo hủy sự kiện: {eventName}";
                        string body = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                                <h2 style='color: #d9534f; text-align: center;'>Sự kiện đã bị hủy</h2>
                                <p>Xin chào <strong>{user.FullName ?? "Quý khách"}</strong>,</p>
                                <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện <strong>{eventName}</strong> (Mã: #{eventId}) mà bạn đã đăng ký tham gia đã bị hủy bởi chủ sân.</p>
                                <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;'>
                                    {(string.IsNullOrEmpty(cancelNote) ? "" : $"<p><strong>Lưu ý từ chủ sân:</strong> {cancelNote}</p>")}
                                    <p><strong>Số tiền hoàn lại:</strong> <span style='color: #28a745; font-weight: bold;'>{participant.refundAmount:N0} VND</span></p>
                                </div>
                                <p>Số tiền trên đã được hoàn trả lại vào ví <strong>Fiebo Wallet</strong> của bạn.</p>
                                <p>Cảm ơn bạn đã luôn đồng hành cùng Fiebo.</p>
                                <hr style='margin: 30px 0;' />
                                <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                            </div>";
                        emailTasks.Add((user.Email, subject, body));
                    }
                    else
                    {
                        _logger.LogWarning("Cannot prepare email: User profile or email not found for UserId {UserId}", participant.userId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error preparing email data for user {UserId}", participant.userId);
                }
            }

            // 3. Send Bulk Emails
            if (emailTasks.Any())
            {
                try
                {
                    _logger.LogInformation("Sending {Count} cancellation emails for Event {EventId} using bulk method.", emailTasks.Count, eventId);
                    await _emailService.SendEmailsAsync(emailTasks);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send bulk cancellation emails for event {EventId}", eventId);
                }
            }
        }
        
        public async Task NotifyVenueApprovedAsync(string ownerId, int venueId, string venueName)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "venue_approved",
                venueId,
                venueName
            });

            await _sseService.SendToUserAsync(ownerId, payload);

            try
            {
                var user = await _identityService.GetUserProfileAsync(ownerId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Thông báo duyệt cơ sở";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #28a745; text-align: center;'>Cơ sở đã được duyệt</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Chủ sân"}</strong>,</p>
                            <p>Chúc mừng! Cơ sở <strong>{venueName}</strong> của bạn đã được quản trị viên duyệt và hiện đã hoạt động trên hệ thống.</p>
                            <p>Hãy bắt đầu tạo sân và khung giờ để đón khách nhé.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";

                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send venue approval email to user {ownerId}: {ex.Message}");
            }
        }

        public async Task NotifyVenueRejectedAsync(string ownerId, int venueId, string venueName, string reason)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "venue_rejected",
                venueId,
                venueName,
                reason
            });

            await _sseService.SendToUserAsync(ownerId, payload);

            try
            {
                var user = await _identityService.GetUserProfileAsync(ownerId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Thông báo từ chối cơ sở";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #d9534f; text-align: center;'>Đăng ký cơ sở bị từ chối</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Chủ sân"}</strong>,</p>
                            <p>Rất tiếc, cơ sở <strong>{venueName}</strong> của bạn đã bị từ chối do chưa đáp ứng đủ yêu cầu.</p>
                            <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;'>
                                <p><strong>Lý do:</strong> {reason}</p>
                            </div>
                            <p>Vui lòng cập nhật lại thông tin và gửi lại yêu cầu duyệt.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";

                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send venue rejection email to user {ownerId}: {ex.Message}");
            }
        }
        public async Task NotifyOwnerNewBookingPendingAsync(string ownerId, int bookingId)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "booking_pending_confirm",
                bookingId
            });
            await _sseService.SendToUserAsync(ownerId, payload);
        }

        public async Task NotifyBookingConfirmedAsync(string userId, int bookingId)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "booking_confirmed",
                bookingId
            });
            await _sseService.SendToUserAsync(userId, payload);

            try
            {
                var user = await _identityService.GetUserProfileAsync(userId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Lịch đặt sân đã được xác nhận";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #28a745; text-align: center;'>Lịch đặt sân đã được xác nhận</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Quý khách"}</strong>,</p>
                            <p>Chủ sân đã xác nhận lịch đặt sân <strong>#{bookingId}</strong> của bạn.</p>
                            <p>Hẹn gặp bạn tại sân!</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";
                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send booking confirmation email to user {userId}: {ex.Message}");
            }
        }

        public async Task NotifyBookingRejectedAsync(string userId, int bookingId, string reason, decimal refundAmount)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "booking_rejected",
                bookingId,
                reason,
                refundAmount
            });
            await _sseService.SendToUserAsync(userId, payload);

            try
            {
                var user = await _identityService.GetUserProfileAsync(userId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Lịch đặt sân bị từ chối";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #d9534f; text-align: center;'>Lịch đặt sân bị từ chối</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Quý khách"}</strong>,</p>
                            <p>Rất tiếc, chủ sân đã từ chối lịch đặt sân <strong>#{bookingId}</strong> của bạn.</p>
                            <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;'>
                                <p><strong>Lý do:</strong> {reason}</p>
                                <p><strong>Số tiền hoàn lại:</strong> <span style='color: #28a745; font-weight: bold;'>{refundAmount:N0} VND</span></p>
                            </div>
                            <p>Số tiền đã được hoàn về ví Fiebo của bạn.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";
                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send booking rejection email to user {userId}: {ex.Message}");
            }
        }

        public async Task NotifyVenueUpdateRejectedAsync(string ownerId, int venueId, string venueName, string adminNote)
        {
            var payload = JsonSerializer.Serialize(new
            {
                type = "venue_update_rejected",
                venueId,
                venueName,
                adminNote
            });
            await _sseService.SendToUserAsync(ownerId, payload);

            try
            {
                var user = await _identityService.GetUserProfileAsync(ownerId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    string subject = "Fiebo - Yêu cầu cập nhật cơ sở bị từ chối";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                            <h2 style='color: #d9534f; text-align: center;'>Yêu cầu cập nhật cơ sở bị từ chối</h2>
                            <p>Xin chào <strong>{user.FullName ?? "Chủ sân"}</strong>,</p>
                            <p>Yêu cầu cập nhật thông tin cơ sở <strong>{venueName}</strong> của bạn đã bị từ chối.</p>
                            <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;'>
                                <p><strong>Ghi chú từ quản trị viên:</strong> {adminNote}</p>
                            </div>
                            <p>Vui lòng kiểm tra lại thông tin và gửi lại yêu cầu.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";
                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send venue update rejection email to owner {ownerId}: {ex.Message}");
            }
        }
    }
}
