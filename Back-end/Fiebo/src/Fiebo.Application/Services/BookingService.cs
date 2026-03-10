using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System.Security.Principal;

namespace Fiebo.Application.Services
{
    public class BookingService : IBookingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IOtpService _otpService;
        private readonly ISmsService _smsService;
        private readonly ILogger<BookingService> _logger;
        private readonly IIdentityService _identityService;
        private readonly ITokenService _tokenService;

        public BookingService(
            IUnitOfWork unitOfWork,
            IOtpService otpService,
            ISmsService smsService,
            ILogger<BookingService> logger,
            IIdentityService identityService,
            ITokenService tokenService
            )
        {
            _unitOfWork = unitOfWork;
            _otpService = otpService;
            _smsService = smsService;
            _logger = logger;
            _identityService = identityService;
            _tokenService = tokenService;
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

        public async Task<ServiceResponse> SendBookingVerifyOtp(string phoneNumber)
        {
            var otpResult = await _otpService.GenerateAndStoreBookingOtpAsync(phoneNumber);
            var message = $"Ma OTP Fiebo: {otpResult.OtpCode}. Hieu luc 5 phut.";
            _logger.LogInformation("Generated OTP for booking verification: {PhoneNumber} - {OtpCode}",
                phoneNumber,
                otpResult.OtpCode);
            var result = await _smsService.SendSmsAsync(phoneNumber, message);
            if (!result.IsSuccess)
            {
                _logger.LogError("Send SMS failed: {Account} - {Reason}",
        phoneNumber,
        result.Message);
                return new ServiceResponse
                {
                    IsSuccess = false,
                    Message = result.Message
                };
            }
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "Mã OTP đã được gửi về số điện thoại của bạn."
            };
        }

        public async Task<string> VerifyBookingOtp(string fullname, string phoneNumber, string otpCode)
        {
            var isValid = await _otpService.ValidateBookingOtpAsync(phoneNumber, otpCode);
            if(!isValid)
            {
                throw new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn.");
            }
            var user = await _identityService.GetUserProfileByEmailOrPhoneAsync(phoneNumber);
            if(user == null)
            {
                var newUser = await _identityService.CreateActiveUserWithoutPasswordAsync(fullname, phoneNumber);
                _unitOfWork.Wallets.Add(new Wallet { UserId = newUser.Id });
                await _unitOfWork.SaveChangesAsync();
                return _tokenService.GenerateAccessToken(newUser!.Id, newUser.FullName ?? "", newUser.Roles ?? "", newUser.Email ?? "");
            }
            return _tokenService.GenerateAccessToken(user!.Id, user.FullName ?? "", user.Roles ?? "", user.Email ?? "");
        }

        public async Task<bool> CreateBookingAsync(CreateBookingRequest request, string userId)
        {
            var booking = new Booking
            {
                UserId = userId,
                Fullname = request.Fullname,
                PhoneNumber = request.PhoneNumber,
                BookingNote = request.BookingNote,
                Status = BookingStatus.Pending
            };

            _unitOfWork.Bookings.Add(booking);

            decimal totalPrice = 0;

            var details = new List<BookingDetail>();

            foreach (var item in request.Details)
            {
                var slot = await _unitOfWork.TimeSlots
                    .GetByIdAsync(item.SlotId);

                var price = slot!.Price;

                totalPrice += price;

                details.Add(new BookingDetail
                {
                    Booking = booking,
                    FieldId = item.FieldId,
                    SlotId = item.SlotId,
                    BookingDate = request.BookingDate,
                    Price = price
                });
            }

            _unitOfWork.BookingDetails.AddRange(details);

            booking.TotalPrice = totalPrice;

            try
            {
                await _unitOfWork.SaveChangesAsync();
            }
            catch (Exception)
            {
                _logger.LogError("Fail to create booking: duplicate index");
                return false;
            }

            return true;
        }

        public async Task<List<BookingHistoryResponse>> GetBookingHistoryAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new UnauthorizedAccessException("Cannot identify current user.");

            var bookings = await _unitOfWork.Bookings.GetBookingHistoryByUserIdAsync(userId);

            return bookings.SelectMany(b => b.BookingDetails.Select(bd => new BookingHistoryResponse
            {
                BookingId = b.Id,
                TotalPrice = b.TotalPrice,
                Status = b.Status.ToString(),
                BookingDate = b.CreatedAt,
                VenueName = bd.Field?.Venue?.Name ?? "N/A",
                FieldName = bd.Field?.Name ?? "N/A",
                Address = bd.Field?.Venue?.AddressDetail ?? "N/A",
                StartTime = bd.TimeSlot?.StartTime ?? default,
                EndTime = bd.TimeSlot?.EndTime ?? default,
                PlayDate = bd.BookingDate
            })).ToList();
        }
    }
}