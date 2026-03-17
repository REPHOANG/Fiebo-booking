using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
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
        private readonly ICacheService _cacheService;

        private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(10);

        public BookingService(
            IUnitOfWork unitOfWork,
            IOtpService otpService,
            ISmsService smsService,
            ILogger<BookingService> logger,
            IIdentityService identityService,
            ITokenService tokenService,
            ICacheService cacheService
            )
        {
            _unitOfWork = unitOfWork;
            _otpService = otpService;
            _smsService = smsService;
            _logger = logger;
            _identityService = identityService;
            _tokenService = tokenService;
            _cacheService = cacheService;
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

            if (booking.ExpiredAt.HasValue && DateTime.Now > booking.ExpiredAt.Value)
            {
                booking.Status = BookingStatus.Expired;
                booking.UpdatedAt = DateTime.Now;
                _unitOfWork.Bookings.Update(booking);
                await _unitOfWork.SaveChangesAsync();
                throw new BadRequestException("Booking đã hết hạn thanh toán. Vui lòng tạo booking mới.");
            }

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

            // Transaction: deduct wallet + update booking status atomically
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                wallet.Balance -= booking.TotalPrice;
                booking.Status = BookingStatus.Booked;
                booking.ExpiredAt = null;
                booking.UpdatedAt = DateTime.Now;

                _unitOfWork.Wallets.Update(wallet);
                _unitOfWork.Bookings.Update(booking);
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

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

            if (status == BookingStatus.CustomerCancelled || status == BookingStatus.OwnerCancelled)
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
            if (!isValid)
            {
                throw new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn.");
            }
            var user = await _identityService.GetUserProfileByEmailOrPhoneAsync(phoneNumber);
            if (user == null)
            {
                var newUser = await _identityService.CreateActiveUserWithoutPasswordAsync(fullname, phoneNumber);
                _unitOfWork.Wallets.Add(new Wallet { UserId = newUser.Id });
                await _unitOfWork.SaveChangesAsync();
                return _tokenService.GenerateAccessToken(newUser!.Id, newUser.FullName ?? "", newUser.Roles ?? "", newUser.Email ?? "");
            }
            return _tokenService.GenerateAccessToken(user!.Id, user.FullName ?? "", user.Roles ?? "", user.Email ?? "");
        }

        public async Task<HoldSlotResponse> CreateBookingAsync(CreateBookingRequest request, string userId)
        {
            // 1. Build lock keys for each slot
            var lockKeys = request.Details
                .Select(d => $"booking:lock:{d.FieldId}:{d.SlotId}:{request.BookingDate}")
                .ToList();

            // 2. Acquire locks for all slots
            var acquiredLocks = new List<(string Key, string Value)>();

            try
            {
                foreach (var lockKey in lockKeys)
                {
                    var lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);

                    if (lockValue is null)
                    {
                        _logger.LogWarning("Failed to acquire lock: {LockKey} — slot is being booked by another user", lockKey);
                        throw new ResourceConflictException("Slot đang được người khác đặt, vui lòng thử lại sau giây lát.");
                    }

                    acquiredLocks.Add((lockKey, lockValue));
                }

                // 3. Check slot availability
                foreach (var item in request.Details)
                {
                    var isAvailable = await _unitOfWork.BookingDetails
                        .IsSlotAvailable(item.SlotId, item.FieldId, request.BookingDate);

                    if (!isAvailable)
                    {
                        throw new ResourceConflictException("Slot đã được đặt. Vui lòng chọn slot khác.");
                    }
                }

                // 4. Create booking with hold
                var expiredAt = DateTime.Now.AddMinutes(5);

                var booking = new Booking
                {
                    UserId = userId,
                    VenueId = request.VenueId,
                    Fullname = request.Fullname,
                    PhoneNumber = request.PhoneNumber,
                    BookingNote = request.BookingNote,
                    BookingType = BookingType.Online,
                    ExpiredAt = expiredAt,
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

                await _unitOfWork.SaveChangesAsync();

                return new HoldSlotResponse
                {
                    BookingId = booking.Id,
                    TotalPrice = totalPrice,
                    ExpiredAt = expiredAt,
                    BookingStatus = BookingStatus.Pending.ToString()
                };
            }
            finally
            {
                // 5. Always release all acquired locks
                foreach (var (key, value) in acquiredLocks)
                {
                    await _cacheService.ReleaseLockAsync(key, value);
                }
            }
        }

        public async Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId, string userId)
        {
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);
            if (booking == null)
            {
                throw new NotFoundException("Booking not found.");
            }
            if (booking.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to view this booking.");
            }
            return new BookingDetailResponse
            {
                BookingId = booking.Id,
                FullName = booking.Fullname,
                Phone = booking.PhoneNumber,
                BookingNote = booking.BookingNote,
                Status = booking.Status.ToString(),
                ExpiredAt = booking.ExpiredAt,
                VenueId = booking.VenueId,
                VenueName = booking.Venue.Name,
                Date = booking.BookingDetails.First().BookingDate,
                TotalPrice = booking.TotalPrice,
                Details = [.. booking.BookingDetails.Select(d => new BookingSlotResponse
                {
                    FieldName = d.Field.Name,
                    StartTime = d.TimeSlot!.StartTime,
                    EndTime = d.TimeSlot.EndTime
                })]
            };
        }

        public async Task<PagedResult<BookingHistoryResponse>> GetBookingHistoryAsync(string userId, BookingHistory request)
        {
            var parameters = new BookingHistory
            {
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                FromDate = request.FromDate,
                ToDate = request.ToDate
            };

            var result = await _unitOfWork.Bookings.GetBookingHistoryByUserIdAsync(userId, parameters);


            var items = result.Items.SelectMany(b => b.BookingDetails.Select(bd => new BookingHistoryResponse
            {
                BookingId = b.Id,
                Status = b.Status.ToString(),
                BookingDate = b.CreatedAt,
                VenueName = bd.Field?.Venue?.Name ?? "N/A",
                Province = bd.Field?.Venue?.Province?.Name ?? "N/A",
                Ward = bd.Field?.Venue?.Ward?.Name ?? "N/A",
                Address = bd.Field?.Venue?.AddressDetail ?? "N/A",
                VenueId = bd.Field?.VenueId ?? 0
            })).ToList();

            return new PagedResult<BookingHistoryResponse>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = items
            };
        }






        public async Task<bool> CreateWalkInBookingAsync(CreateBookingRequest request, string userId)
        {
            // 1. Build lock keys for each slot
            var lockKeys = request.Details
                .Select(d => $"booking:lock:{d.FieldId}:{d.SlotId}:{request.BookingDate}")
                .ToList();

            // 2. Acquire locks for all slots
            var acquiredLocks = new List<(string Key, string Value)>();

            try
            {
                foreach (var lockKey in lockKeys)
                {
                    var lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);

                    if (lockValue is null)
                    {
                        _logger.LogWarning("Failed to acquire lock: {LockKey} — slot is being booked by another user", lockKey);
                        throw new ResourceConflictException("Slot đang được người khác đặt, vui lòng thử lại sau giây lát.");
                    }

                    acquiredLocks.Add((lockKey, lockValue));
                }

                // 3. Check slot availability
                foreach (var item in request.Details)
                {
                    var isAvailable = await _unitOfWork.BookingDetails
                        .IsSlotAvailable(item.SlotId, item.FieldId, request.BookingDate);

                    if (!isAvailable)
                    {
                        throw new ResourceConflictException("Slot đã được đặt. Vui lòng chọn slot khác.");
                    }
                }

                var booking = new Booking
                {
                    UserId = userId,
                    VenueId = request.VenueId,
                    Fullname = request.Fullname,
                    PhoneNumber = request.PhoneNumber,
                    BookingNote = request.BookingNote,
                    BookingType = BookingType.WalkIn,
                    Status = BookingStatus.Booked
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

                await _unitOfWork.SaveChangesAsync();

                return true;
            }
            finally
            {
                // 5. Always release all acquired locks
                foreach (var (key, value) in acquiredLocks)
                {
                    await _cacheService.ReleaseLockAsync(key, value);
                }
            }
        }

        // ================================================================
        //   Cancel Booking
        // ================================================================

        public async Task<string> GetCancelPreviewAsync(int bookingId, string userId)
        {
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);

            if (booking is null)
                throw new NotFoundException("Booking not found.");

            if (booking.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to cancel this booking.");

            if (booking.Status != BookingStatus.Booked)
                throw new BadRequestException("Only booked bookings can be cancelled.");

            var bookingStartTime = GetBookingStartTime(booking);

            if (DateTime.Now >= bookingStartTime)
                throw new BadRequestException("Cannot cancel a booking after the start time.");

            var hoursBeforeStart = (bookingStartTime - DateTime.Now).TotalHours;
            var refundPercentage = CalculateRefundPercentage(hoursBeforeStart);
            var refundAmount = booking.TotalPrice * refundPercentage / 100m;

            return $"Refund {refundPercentage}% — {refundAmount:N0} VND will be returned to your wallet.";
        }

        public async Task<bool> CancelBookingAsync(int bookingId, string userId)
        {
            // 1. Load booking with details (tracked)
            var booking = (await _unitOfWork.Bookings
                .FindAsync(b => b.Id == bookingId))
                .FirstOrDefault();

            if (booking is null)
                throw new NotFoundException("Booking not found.");

            // BR-25: Only owner can cancel
            if (booking.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to cancel this booking.");

            // Only Booked status can be cancelled
            if (booking.Status != BookingStatus.Booked)
                throw new BadRequestException("Only booked bookings can be cancelled.");

            // Load booking details with TimeSlot for start time calculation
            var bookingWithDetails = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);
            var bookingStartTime = GetBookingStartTime(bookingWithDetails!);

            // BR-26: Can only cancel before start time
            if (DateTime.Now >= bookingStartTime)
                throw new BadRequestException("Cannot cancel a booking after the start time.");

            // BR-28: Calculate refund
            var hoursBeforeStart = (bookingStartTime - DateTime.Now).TotalHours;
            var refundPercentage = CalculateRefundPercentage(hoursBeforeStart);
            var refundAmount = booking.TotalPrice * refundPercentage / 100m;

            // BR-27: Refund to wallet within a transaction
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                // Update booking status
                booking.Status = BookingStatus.CustomerCancelled;
                booking.UpdatedAt = DateTime.Now;
                _unitOfWork.Bookings.Update(booking);

                // Refund to wallet (if refundAmount > 0)
                if (refundAmount > 0)
                {
                    var wallet = (await _unitOfWork.Wallets
                        .FindAsync(w => w.UserId == userId))
                        .FirstOrDefault();

                    if (wallet is null)
                        throw new NotFoundException("Wallet not found.");

                    wallet.Balance += refundAmount;
                    _unitOfWork.Wallets.Update(wallet);
                }

                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();

                _logger.LogInformation(
                    "Booking {BookingId} cancelled by user {UserId}. Refund: {RefundPercentage}% = {RefundAmount}",
                    bookingId, userId, refundPercentage, refundAmount);

                return true;
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }

        /// <summary>
        /// Gets the earliest start time from booking details.
        /// Combines BookingDate + TimeSlot.StartTime.
        /// </summary>
        private static DateTime GetBookingStartTime(Booking booking)
        {
            var earliestDetail = booking.BookingDetails
                .OrderBy(d => d.BookingDate)
                .ThenBy(d => d.TimeSlot!.StartTime)
                .First();

            return earliestDetail.BookingDate
                .ToDateTime(earliestDetail.TimeSlot!.StartTime);
        }

        /// <summary>
        /// BR-28 Cancellation refund policy:
        /// > 24h → 100% | 12-24h → 70% | 6-12h → 50% | less than 6h → 0%
        /// </summary>
        private static int CalculateRefundPercentage(double hoursBeforeStart)
        {
            if (hoursBeforeStart > 24)
                return 100;
            if (hoursBeforeStart >= 12)
                return 70;
            if (hoursBeforeStart >= 6)
                return 50;

            return 0;
        }
    }
}
