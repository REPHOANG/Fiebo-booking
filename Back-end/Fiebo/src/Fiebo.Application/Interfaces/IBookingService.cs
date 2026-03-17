using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Interfaces
{
    public interface IBookingService
    {
        Task<BookingPaymentResponse> MakeBookingPaymentAsync(int bookingId, string userId);
        Task<ServiceResponse> SendBookingVerifyOtp(string phoneNumber);
        Task<string> VerifyBookingOtp(string fullname, string phoneNumber, string otpCode);
        Task<HoldSlotResponse> CreateBookingAsync(CreateBookingRequest request, string userId);
        Task<PagedResult<BookingHistoryResponse>> GetBookingHistoryAsync(string userId, BookingHistory request);
        Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId, string userId);
        Task<string> GetCancelPreviewAsync(int bookingId, string userId);
        Task<bool> CancelBookingAsync(int bookingId, string userId);
        Task<bool> CreateWalkInBookingAsync(CreateBookingRequest request, string userId);
        Task<OwnerBookingDetailResponse?> GetBookingDetailForOwnerAsync(int bookingId, string ownerId);
        Task<bool> OwnerCancelBookingAsync(int bookingId, string ownerId, string cancelReason);
    }
}
