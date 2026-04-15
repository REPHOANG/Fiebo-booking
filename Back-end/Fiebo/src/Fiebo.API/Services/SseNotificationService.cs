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

        public SseNotificationService(SseService sseService, IEmailService emailService, IIdentityService identityService)
        {
            _sseService = sseService;
            _emailService = emailService;
            _identityService = identityService;
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
            var payload = JsonSerializer.Serialize(new
            {
                type = "event_cancelled_by_owner",
                eventId,
                eventName,
                cancelNote,
                refundAmount
            });

            await _sseService.SendToUserAsync(userId, payload);

            // Send Email Notification
            try
            {
                var user = await _identityService.GetUserProfileAsync(userId);
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
                                <p><strong>Số tiền hoàn lại:</strong> <span style='color: #28a745; font-weight: bold;'>{refundAmount:N0} VND</span></p>
                            </div>
                            <p>Số tiền trên đã được hoàn trả lại vào ví <strong>Fiebo Wallet</strong> của bạn.</p>
                            <p>Cảm ơn bạn đã luôn đồng hành cùng Fiebo.</p>
                            <hr style='margin: 30px 0;' />
                            <p style='font-size: 12px; color: #888; text-align: center;'>© {DateTime.Now.Year} Fiebo. All rights reserved.</p>
                        </div>";

                    await _emailService.SendEmailAsync(user.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the SSE notification
                Console.WriteLine($"Failed to send event cancellation email to user {userId}: {ex.Message}");
            }
        }
    }
}
