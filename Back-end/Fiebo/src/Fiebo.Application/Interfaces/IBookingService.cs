using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Booking;

namespace Fiebo.Application.Interfaces
{
    public interface IBookingService
    {
        Task<BookingPaymentResponse> MakeBookingPaymentAsync(int bookingId, string userId);
        Task<ServiceResponse> SendBookingVerifyOtp(string phoneNumber);
        Task<string> VerifyBookingOtp(string fullname, string phoneNumber, string otpCode);
        Task<bool> CreateBookingAsync(CreateBookingRequest request, string userId);
        Task<List<BookingHistoryResponse>> GetBookingHistoryAsync(string userId);
    }
}
