using Fiebo.Application.DTOs.Booking;

namespace Fiebo.Application.Interfaces
{
    public interface IBookingService
    {
        Task<BookingPaymentResponse> MakeBookingPaymentAsync(int bookingId, string userId);
    }
}
