using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;

namespace Fiebo.Application.Services
{
    public class BookingService : IBookingService
    {
        private readonly IUnitOfWork _unitOfWork;

        public BookingService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<BookingPaymentResponse> MakeBookingPaymentAsync(int bookingId, string userId)
        {
            if (bookingId <= 0)
            {
                throw new BadRequestException("BookingId must be greater than 0.");
            }

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Cannot identify current user.");
            }

            var booking = (await _unitOfWork.Bookings
                .FindAsync(b => b.Id == bookingId && b.UserId == userId))
                .FirstOrDefault();

            if (booking is null)
            {
                throw new NotFoundException("Booking not found for current user.");
            }

            EnsureBookingCanBePaid(booking.Status);

            if (booking.TotalPrice <= 0)
            {
                throw new BadRequestException("Booking total price must be greater than 0.");
            }

            var wallet = (await _unitOfWork.Wallets
                .FindAsync(w => w.UserId == userId))
                .FirstOrDefault();

            if (wallet is null)
            {
                throw new NotFoundException("Wallet not found. Please perform UC-29_Top Up Wallet first.");
            }

            if (wallet.Balance < booking.TotalPrice)
            {
                throw new BadRequestException("Insufficient wallet balance. Please perform UC-29_Top Up Wallet before payment.");
            }

            wallet.Balance -= booking.TotalPrice;
            booking.Status = BookingStatus.Booked;
            booking.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Wallets.Update(wallet);
            _unitOfWork.Bookings.Update(booking);
            await _unitOfWork.SaveChangesAsync();

            return new BookingPaymentResponse
            {
                BookingId = booking.Id,
                PaidAmount = booking.TotalPrice,
                RemainingBalance = wallet.Balance,
                BookingStatus = booking.Status.ToString()
            };
        }

        private static void EnsureBookingCanBePaid(BookingStatus status)
        {
            if (status == BookingStatus.Pending)
            {
                return;
            }

            if (status is BookingStatus.Booked or BookingStatus.Completed)
            {
                throw new BadRequestException("Booking has already been paid.");
            }

            if (status == BookingStatus.Cancelled)
            {
                throw new BadRequestException("Cancelled booking cannot be paid.");
            }

            if (status == BookingStatus.Expired)
            {
                throw new BadRequestException("Expired booking cannot be paid.");
            }

            throw new BadRequestException("Booking status is not valid for payment.");
        }
    }
}
