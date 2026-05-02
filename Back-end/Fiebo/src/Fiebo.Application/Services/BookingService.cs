using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.Extensions.Logging;
using System.Security.Principal;
using Fiebo.Application.Validators;

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
        private readonly INotificationService _notificationService;

        private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(5);

        public BookingService(
            IUnitOfWork unitOfWork,
            IOtpService otpService,
            ISmsService smsService,
            ILogger<BookingService> logger,
            IIdentityService identityService,
            ITokenService tokenService,
            ICacheService cacheService,
            INotificationService notificationService
            )
        {
            _unitOfWork = unitOfWork;
            _otpService = otpService;
            _smsService = smsService;
            _logger = logger;
            _identityService = identityService;
            _tokenService = tokenService;
            _cacheService = cacheService;
            _notificationService = notificationService;
        }

        public async Task<BookingPaymentResponse> MakeBookingPaymentAsync(int bookingId, string userId)
        {
            if (bookingId <= 0)
            {
                throw new BadRequestException("Không có dữ liệu hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Không thể định danh người dùng");
            }

            var booking = (await _unitOfWork.Bookings
                .FindAsync(b => b.Id == bookingId && b.UserId == userId))
                .FirstOrDefault();

            if (booking is null)
            {
                throw new NotFoundException("Không tìm thấy lịch đặt");
            }

            EnsureBookingCanBePaid(booking.Status);

            if (booking.ExpiredAt.HasValue && DateTime.Now > booking.ExpiredAt.Value)
            {
                booking.Status = BookingStatus.Expired;
                booking.UpdatedAt = DateTime.Now;
                _unitOfWork.Bookings.Update(booking);
                await _unitOfWork.SaveChangesAsync();
                throw new BadRequestException("Thời gian giữ chỗ và thanh toán đã hết. Vui lòng đặt lại.");
            }

            if (booking.TotalPrice <= 0)
            {
                throw new BadRequestException("Không có dữ liệu hợp lệ.");
            }

            var wallet = (await _unitOfWork.Wallets
                .FindAsync(w => w.UserId == userId))
                .FirstOrDefault();

            if (wallet is null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
            }

            if (wallet.Balance < booking.TotalPrice)
            {
                throw new BadRequestException("Không thể lấy số dư ví vào lúc này.");
            }

            // Transaction: deduct wallet + update booking status atomically
            await _unitOfWork.ExecuteStrategyAsync(async () =>
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    // Load earliest slot start time to calculate ConfirmExpiredAt
                    var bookingWithDetails = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);
                    DateTime slotStart;
                    if (bookingWithDetails?.BookingDetails != null && bookingWithDetails.BookingDetails.Any(d => d.TimeSlot != null))
                    {
                        slotStart = bookingWithDetails.BookingDetails
                            .Where(d => d.TimeSlot != null)
                            .Select(d => booking.BookingDate.ToDateTime(d.TimeSlot!.StartTime))
                            .OrderBy(t => t)
                            .First();
                    }
                    else
                    {
                        // Fallback: không tìm thấy slot → áp dụng BR3 (12h)
                        slotStart = DateTime.Now.AddHours(25);
                    }

                    var confirmExpiredAt = CalculateConfirmExpiredAt(DateTime.Now, slotStart);

                    wallet.Balance -= booking.TotalPrice;
                    booking.Status = BookingStatus.Pending; // Đã thanh toán, chờ chủ sân confirm
                    booking.ExpiredAt = null;
                    booking.ConfirmExpiredAt = confirmExpiredAt;
                    booking.UpdatedAt = DateTime.Now;

                    _unitOfWork.Wallets.Update(wallet);
                    _unitOfWork.Bookings.Update(booking);
                    _unitOfWork.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TransactionType = TransactionType.Booking,
                        Direction = TransactionDirection.Debit,
                        Amount = booking.TotalPrice,
                        ReferenceId = booking.Id
                    });
                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();
                }
                catch
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    throw;
                }
            });

            // Notify owner
            try
            {
                var ownerUserId = (await _unitOfWork.Venues
                    .FindAsync(v => v.Id == booking.VenueId))
                    .FirstOrDefault()?.OwnerId;

                if (!string.IsNullOrEmpty(ownerUserId))
                {
                    await _notificationService.NotifyOwnerNewBookingPendingAsync(ownerUserId, booking.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send notification to owner for booking {BookingId}", booking.Id);
            }

            return new BookingPaymentResponse
            {
                BookingId = booking.Id,
                PaidAmount = booking.TotalPrice,
                RemainingBalance = wallet.Balance,
                BookingStatus = booking.Status.ToString()
            };
        }

        /// <summary>
        /// Tính thời hạn chủ sân phải confirm theo 3 Business Rules.
        /// </summary>
        private static DateTime CalculateConfirmExpiredAt(DateTime createdAt, DateTime earliestSlotStart)
        {
            var delta = earliestSlotStart - createdAt;

            if (delta < TimeSpan.FromHours(1))
            {
                // BR1: slot bắt đầu trong <1h → tự hủy đúng lúc slot bắt đầu
                return earliestSlotStart;
            }
            else if (delta < TimeSpan.FromHours(24))
            {
                // BR2: slot bắt đầu trong 1h-24h → tự hủy trước slot 1h
                return earliestSlotStart.AddHours(-1);
            }
            else
            {
                // BR3: slot bắt đầu sau >24h → tự hủy sau 12h kể từ lúc đặt
                return createdAt.AddHours(12);
            }
        }

        private static void EnsureBookingCanBePaid(BookingStatus status)
        {
            if (status == BookingStatus.Holding)
            {
                return; // Holding = chờ thanh toán, hợp lệ
            }

            if (status == BookingStatus.Pending)
            {
                throw new BadRequestException("Lịch đặt đã được thanh toán, đang chờ chủ sân xác nhận.");
            }

            if (status is BookingStatus.Booked or BookingStatus.Completed)
            {
                throw new BadRequestException("Không có dữ liệu hợp lệ.");
            }

            if (status == BookingStatus.CustomerCancelled || status == BookingStatus.OwnerCancelled)
            {
                throw new BadRequestException("Không có dữ liệu hợp lệ.");
            }

            if (status == BookingStatus.Expired)
            {
                throw new NotFoundException("Thời gian giữ chỗ và thanh toán đã hết. Vui lòng đặt lại.");
            }

            throw new BadRequestException("Không có dữ liệu hợp lệ.");
        }
        // OTP for booking verification: cancelled
        #region
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
                throw new BadRequestException("Mã OTP không hợp lệ. Vui lòng thử lại.");
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
        #endregion

        public async Task<HoldSlotResponse> CreateBookingAsync(CreateBookingRequest request, string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new BadRequestException("Bạn không có quyền để thực hiện hành động này");

            if (request.Details == null || !request.Details.Any())
                throw new BadRequestException("Vui lòng chọn ít nhất một khung giờ.");

            var duplicates = request.Details
                .GroupBy(x => new { x.FieldId, x.SlotId })
                .Where(g => g.Count() > 1);

            if (duplicates.Any())
                throw new BadRequestException("Danh sách đặt sân bị trùng lặp khung giờ.");

            var now = DateTime.Now;
            var maxBookingDate = BookingDateValidator.GetMaxDate(now);

            var venue = await _unitOfWork.Venues.GetByIdAsync(request.VenueId) ?? throw new BadRequestException("Cơ sở này hiện không hoạt động.");
            var ownerPlan = (await _unitOfWork.OwnerPlans.FindAsync(p => p.OwnerId == venue.OwnerId && p.Status == OwnerPlanStatus.Active && p.EndDate > DateTime.Now)).Any();
            if (venue.Status != VenueStatus.Active || !ownerPlan)
                throw new BadRequestException("Cơ sở này hiện không hoạt động.");

            if (request.BookingDate < DateOnly.FromDateTime(now))
                throw new BadRequestException("Ngày đặt không hợp lệ.");

            if (request.BookingDate > maxBookingDate)
                throw new BadRequestException($"Chỉ có thể đặt lịch đến ngày {maxBookingDate:dd/MM/yyyy}.");

            var fieldIds = request.Details.Select(x => x.FieldId).Distinct().ToList();
            var slotIds = request.Details.Select(x => x.SlotId).Distinct().ToList();

            // Lock keys
            var lockKeys = request.Details
                .Select(d => $"booking:lock:{d.FieldId}:{d.SlotId}:{request.BookingDate}")
                .ToList();

            var acquiredLocks = new List<(string Key, string Value)>();

            try
            {
                foreach (var lockKey in lockKeys)
                {
                    var lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);

                    if (lockValue is null)
                    {
                        _logger.LogWarning("Failed to acquire lock: {LockKey}", lockKey);
                        throw new ResourceConflictException("Slot hiện tại đã bị khóa. Vui lòng chọn slot khác.");
                    }

                    acquiredLocks.Add((lockKey, lockValue));
                }

                var fields = await _unitOfWork.Fields.GetByIdsAsync(fieldIds);
                var slots = await _unitOfWork.TimeSlots.GetByIdsAsync(slotIds);

                var fieldDict = fields.ToDictionary(x => x.Id);
                var slotDict = slots.ToDictionary(x => x.Id);

                foreach (var item in request.Details)
                {
                    if (!fieldDict.TryGetValue(item.FieldId, out var field) || field.Status != FieldStatus.Active)
                        throw new BadRequestException("Sân này hiện không hoạt động.");

                    if (field.VenueId != request.VenueId)
                        throw new BadRequestException("Sân không thuộc cơ sở này.");

                    if (!slotDict.TryGetValue(item.SlotId, out var slot) || slot.IsDeleted)
                        throw new BadRequestException("Slot không tồn tại hoặc đã bị xóa.");

                    if (slot.VenueId != request.VenueId)
                        throw new BadRequestException("Slot không thuộc cơ sở này.");

                    var slotDateTime = request.BookingDate.ToDateTime(slot.StartTime);
                    if (slotDateTime < now)
                        throw new BadRequestException("Slot đã bắt đầu hoặc đã kết thúc.");
                }

                var unavailableSlots = await _unitOfWork.BookingDetails
                    .GetUnavailableSlots(slotIds, fieldIds, request.BookingDate);

                if (unavailableSlots.Any())
                    throw new ResourceConflictException("Sân hiện tại hiện không có slot trống.");

                var eventUsedSlots = await _unitOfWork.TicketEvents
                    .GetUsedSlots(slotIds, fieldIds, request.BookingDate);

                if (eventUsedSlots.Any())
                    throw new ResourceConflictException("Sân hiện tại hiện không có slot trống.");

                var expiredAt = now.AddMinutes(5);

                var booking = new Booking
                {
                    UserId = userId,
                    VenueId = request.VenueId,
                    Fullname = request.Fullname,
                    PhoneNumber = request.PhoneNumber,
                    BookingDate = request.BookingDate,
                    BookingNote = request.BookingNote,
                    BookingType = BookingType.Online,
                    ExpiredAt = expiredAt,
                    Status = BookingStatus.Holding  // Đang giữ slot, chờ thanh toán
                };

                _unitOfWork.Bookings.Add(booking);


                // Handle Services
                if (request.Services != null && request.Services.Any())
                {
                    var serviceIds = request.Services.Select(s => s.ServiceId).ToList();
                    var venueServices = _unitOfWork.VenueServiceItems.GetQueryable()
                        .Where(s => serviceIds.Contains(s.Id) && s.VenueId == request.VenueId && !s.IsDeleted)
                        .ToList();

                    var serviceDict = venueServices.ToDictionary(s => s.Id);

                    foreach (var serviceRequest in request.Services)
                    {
                        if (!serviceDict.TryGetValue(serviceRequest.ServiceId, out var service))
                        {
                            throw new BadRequestException($"Dịch vụ ID {serviceRequest.ServiceId} không tồn tại hoặc không thuộc cơ sở này.");
                        }

                        if (serviceRequest.Quantity <= 0)
                        {
                            throw new BadRequestException($"Số lượng dịch vụ {service.Name} phải lớn hơn 0.");
                        }

                        var serviceItem = new BookingServiceItem
                        {
                            Booking = booking,
                            VenueServiceItemId = service.Id,
                            Quantity = serviceRequest.Quantity,
                            Price = service.Price
                        };

                        _unitOfWork.BookingServiceItems.Add(serviceItem);
                    }
                }

                var details = new List<BookingDetail>();
                decimal slotsTotalPrice = 0;

                foreach (var item in request.Details)
                {
                    var slot = slotDict[item.SlotId];

                    slotsTotalPrice += slot.Price;

                    details.Add(new BookingDetail
                    {
                        Booking = booking,
                        FieldId = item.FieldId,
                        SlotId = item.SlotId,
                        Price = slot.Price
                    });
                }

                _unitOfWork.BookingDetails.AddRange(details);
                booking.TotalPrice = slotsTotalPrice; // TotalPrice only includes slots

                await _unitOfWork.SaveChangesAsync();

                return new HoldSlotResponse
                {
                    BookingId = booking.Id,
                    TotalPrice = slotsTotalPrice,
                    ExpiredAt = expiredAt,
                    BookingStatus = BookingStatus.Pending.ToString()
                };
            }
            finally
            {
                // Release locks
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
                throw new NotFoundException("Không tìm thấy lịch đặt");
            }
            if (booking.UserId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền để xem lịch đặt này");
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
                Date = booking.BookingDate,
                TotalPrice = booking.TotalPrice,
                CancelReason = booking.CancelBooking?.CancelReason,
                Details = [.. booking.BookingDetails.Select(d => new BookingSlotResponse
                {
                    FieldName = d.Field.Name,
                    StartTime = d.TimeSlot!.StartTime,
                    EndTime = d.TimeSlot.EndTime
                })],
                Services = [.. booking.BookingServiceItems.Select(si => new BookingServiceItemResponse
                {
                    ServiceName = si.VenueServiceItem.Name,
                    Quantity = si.Quantity,
                    Price = si.Price
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
            var bookingIds = result.Items.Select(b => b.Id).ToList();
            var ratedBookingIds = await _unitOfWork.Bookings.GetRatedBookingIdsAsync(bookingIds);


            var items = result.Items.Select(b => new BookingHistoryResponse
            {
                BookingId = b.Id,
                Status = b.Status.ToString(),
                BookingDate = b.BookingDate,
                VenueName = b.Venue?.Name ?? "N/A",
                ThumbnailUrl = b.Venue?.ThumbnailUrl,
                Province = b.Venue?.Province?.Name ?? "N/A",
                Ward = b.Venue?.Ward?.Name ?? "N/A",
                Address = b.Venue?.AddressDetail ?? "N/A",
                VenueId = b.VenueId,
                CanReview = b.Status == BookingStatus.Completed && !ratedBookingIds.Contains(b.Id)
            }).ToList();

            return new PagedResult<BookingHistoryResponse>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = items
            };
        }






        public async Task<bool> CreateWalkInBookingAsync(CreateBookingRequest request, string? userId, string? userRole)
        {
            if (request.Details == null || !request.Details.Any())
                throw new BadRequestException("Vui lòng chọn ít nhất một khung giờ.");

            var duplicates = request.Details
                .GroupBy(x => new { x.FieldId, x.SlotId })
                .Where(g => g.Count() > 1);

            if (duplicates.Any())
                throw new BadRequestException("Danh sách đặt sân bị trùng lặp khung giờ.");

            if (userId == null) throw new UnauthorizedException("Bạn cần đăng nhập");
            if (userRole == null)
            {
                throw new ForbiddenException("Bạn không có quyền để thực hiện hành động này.");
            }

            var now = DateTime.Now;
            var maxBookingDate = BookingDateValidator.GetMaxDate(now);
            var venue = await _unitOfWork.Venues.GetByIdAsync(request.VenueId);
            if (venue == null || venue.Status != VenueStatus.Active)
                throw new BadRequestException("Cơ sở này hiện không hoạt động.");
            if (userRole == AppRoles.FieldOwner && venue.OwnerId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền để thực hiện hành động này.");
            }
            if (userRole == AppRoles.FieldStaff)
            {
                var staff = (await _unitOfWork.VenueStaffs.FindAsync(s => s.StaffId == userId && s.VenueId == request.VenueId)).Any();
                if (!staff)
                    throw new ForbiddenException("Bạn không có quyền để thực hiện hành động này.");
            }
            if (request.BookingDate < DateOnly.FromDateTime(now))
                throw new BadRequestException("Ngày đặt không hợp lệ.");

            if (request.BookingDate > maxBookingDate)
                throw new BadRequestException($"Chỉ có thể đặt lịch đến ngày {maxBookingDate:dd/MM/yyyy}.");

            var fieldIds = request.Details.Select(x => x.FieldId).Distinct().ToList();
            var slotIds = request.Details.Select(x => x.SlotId).Distinct().ToList();

            var lockKeys = request.Details
                .Select(d => $"booking:lock:{d.FieldId}:{d.SlotId}:{request.BookingDate}")
                .ToList();

            var acquiredLocks = new List<(string Key, string Value)>();

            try
            {
                foreach (var lockKey in lockKeys)
                {
                    var lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);

                    if (lockValue is null)
                    {
                        _logger.LogWarning("Failed to acquire lock: {LockKey}", lockKey);
                        throw new ResourceConflictException("Slot hiện tại đã bị khóa. Vui lòng chọn slot khác.");
                    }

                    acquiredLocks.Add((lockKey, lockValue));
                }

                var fields = await _unitOfWork.Fields.GetByIdsAsync(fieldIds);
                var slots = await _unitOfWork.TimeSlots.GetByIdsAsync(slotIds);

                var fieldDict = fields.ToDictionary(x => x.Id);
                var slotDict = slots.ToDictionary(x => x.Id);

                foreach (var item in request.Details)
                {
                    if (!fieldDict.TryGetValue(item.FieldId, out var field) || field.Status != FieldStatus.Active)
                        throw new BadRequestException("Sân không tồn tại hoặc đã bị vô hiệu hóa.");

                    if (field.VenueId != request.VenueId)
                        throw new BadRequestException("Sân không thuộc cơ sở này.");

                    if (!slotDict.TryGetValue(item.SlotId, out var slot) || slot.IsDeleted)
                        throw new BadRequestException("Slot không tồn tại hoặc đã bị xóa.");

                    if (slot.VenueId != request.VenueId)
                        throw new BadRequestException("Slot không thuộc cơ sở này.");

                    var slotDateTime = request.BookingDate.ToDateTime(slot.StartTime);
                    if (slotDateTime < now)
                        throw new BadRequestException("Slot đã bắt đầu hoặc đã kết thúc.");
                }

                var unavailableSlots = await _unitOfWork.BookingDetails
                    .GetUnavailableSlots(slotIds, fieldIds, request.BookingDate);

                if (unavailableSlots.Any())
                    throw new ResourceConflictException("Một số slot đã được đặt.");

                var eventUsedSlots = await _unitOfWork.TicketEvents
                    .GetUsedSlots(slotIds, fieldIds, request.BookingDate);

                if (eventUsedSlots.Any())
                    throw new ResourceConflictException("Một số slot đã được sử dụng cho sự kiện.");

                var booking = new Booking
                {
                    UserId = userId,
                    VenueId = request.VenueId,
                    Fullname = request.Fullname,
                    PhoneNumber = request.PhoneNumber,
                    BookingDate = request.BookingDate,
                    BookingNote = request.BookingNote,
                    BookingType = BookingType.WalkIn,
                    Status = BookingStatus.Booked
                };

                _unitOfWork.Bookings.Add(booking);


                // Handle Services
                if (request.Services != null && request.Services.Any())
                {
                    var serviceIds = request.Services.Select(s => s.ServiceId).ToList();
                    var venueServices = _unitOfWork.VenueServiceItems.GetQueryable()
                        .Where(s => serviceIds.Contains(s.Id) && s.VenueId == request.VenueId && !s.IsDeleted)
                        .ToList();

                    var serviceDict = venueServices.ToDictionary(s => s.Id);

                    foreach (var serviceRequest in request.Services)
                    {
                        if (!serviceDict.TryGetValue(serviceRequest.ServiceId, out var service))
                        {
                            throw new BadRequestException($"Dịch vụ ID {serviceRequest.ServiceId} không tồn tại hoặc không thuộc cơ sở này.");
                        }

                        if (serviceRequest.Quantity <= 0)
                        {
                            throw new BadRequestException($"Số lượng dịch vụ {service.Name} phải lớn hơn 0.");
                        }

                        var serviceItem = new BookingServiceItem
                        {
                            Booking = booking,
                            VenueServiceItemId = service.Id,
                            Quantity = serviceRequest.Quantity,
                            Price = service.Price
                        };

                        _unitOfWork.BookingServiceItems.Add(serviceItem);
                    }
                }

                var details = new List<BookingDetail>();
                decimal slotsTotalPrice = 0;

                foreach (var item in request.Details)
                {
                    var slot = slotDict[item.SlotId];

                    slotsTotalPrice += slot.Price;

                    details.Add(new BookingDetail
                    {
                        Booking = booking,
                        FieldId = item.FieldId,
                        SlotId = item.SlotId,
                        Price = slot.Price
                    });
                }

                _unitOfWork.BookingDetails.AddRange(details);
                booking.TotalPrice = slotsTotalPrice;

                await _unitOfWork.SaveChangesAsync();

                return true;
            }
            finally
            {
                foreach (var (key, value) in acquiredLocks)
                {
                    await _cacheService.ReleaseLockAsync(key, value);
                }
            }
        }

        // ================================================================
        //   Cancel Booking
        // ================================================================

        public async Task<string> GetCancelPreviewAsync(int bookingId, string? userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("Bạn cần đăng nhập để thực hiện hành động này.");
            }
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);

            if (booking is null)
                throw new NotFoundException("Không tìm thấy lịch đặt");

            if (booking.UserId != userId)
                throw new ForbiddenException("Bạn không có quyền để xem lịch đặt này");

            if (booking.Status != BookingStatus.Booked && booking.Status != BookingStatus.Pending)
                throw new BadRequestException("Lịch không thể hủy");

            var bookingStartTime = GetBookingStartTime(booking);

            if (DateTime.Now >= bookingStartTime)
                throw new BadRequestException("Đã bắt đầu lịch đặt, không thể hủy");

            var hoursBeforeStart = (bookingStartTime - DateTime.Now).TotalHours;
            var refundPercentage = CalculateRefundPercentage(hoursBeforeStart);
            var refundAmount = booking.TotalPrice * refundPercentage / 100m;

            if (booking.Status == BookingStatus.Pending)
            {
                return "Lịch đặt này vẫn chưa được chủ sân xác nhận, nếu huỷ bạn sẽ được hoàn lại số tiền đã thanh toán vào ví.";
            }

            return refundPercentage switch
            {
                100 => $"Quý khách hủy lịch trước 24 giờ so với giờ bắt đầu, vì vậy sẽ được hoàn {refundPercentage}% tương ứng ({refundAmount:N0} VND) vào ví.",
                70 => $"Quý khách hủy lịch trong khoảng 12–24 giờ trước giờ bắt đầu, vì vậy sẽ được hoàn {refundPercentage}% tương ứng ({refundAmount:N0} VND) vào ví.",
                50 => $"Quý khách hủy lịch trong khoảng 6–12 giờ trước giờ bắt đầu, vì vậy sẽ được hoàn {refundPercentage}% tương ứng ({refundAmount:N0} VND) vào ví.",
                _ => $"Quý khách hủy lịch trong vòng dưới 6 giờ trước giờ bắt đầu, vì vậy sẽ không được hoàn tiền."
            };
        }

        public async Task<bool> CancelBookingAsync(int bookingId, string userId)
        {
            // 1. Load booking with details (tracked)
            var booking = (await _unitOfWork.Bookings
                .FindAsync(b => b.Id == bookingId))
                .FirstOrDefault();

            if (booking is null)
                throw new NotFoundException("Không tìm thấy lịch đặt");

            // BR-25: Only owner can cancel
            if (booking.UserId != userId)
                throw new ForbiddenException("Bạn không có quyền để xem lịch đặt này");

            // Only Booked status can be cancelled
            if (booking.Status != BookingStatus.Booked && booking.Status != BookingStatus.Pending)
                throw new BadRequestException("Lịch không thể hủy");

            // Load booking details with TimeSlot for start time calculation
            var bookingWithDetails = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);
            var bookingStartTime = GetBookingStartTime(bookingWithDetails!);

            // BR-26: Can only cancel before start time
            if (DateTime.Now >= bookingStartTime)
                throw new BadRequestException("Lịch không thể hủy");

            // BR-28: Calculate refund
            var hoursBeforeStart = (bookingStartTime - DateTime.Now).TotalHours;
            var refundPercentage = 0;
            if (booking.Status == BookingStatus.Booked)
            {
                refundPercentage = CalculateRefundPercentage(hoursBeforeStart);
            }
            else if (booking.Status == BookingStatus.Pending)
            {
                refundPercentage = 100;
            }
            var refundAmount = booking.TotalPrice * refundPercentage / 100m;

            // BR-27: Refund to wallet within a transaction
            await _unitOfWork.ExecuteStrategyAsync(async () =>
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    // Update booking status
                    booking.Status = BookingStatus.CustomerCancelled;
                    booking.UpdatedAt = DateTime.Now;
                    _unitOfWork.Bookings.Update(booking);
                    _unitOfWork.CancelBooking.Add(new CancelBooking
                    {
                        BookingId = bookingId,
                        RefundAmount = refundAmount
                    });

                    // Refund to wallet (if refundAmount > 0)
                    if (refundAmount > 0)
                    {
                        var wallet = (await _unitOfWork.Wallets
                            .FindAsync(w => w.UserId == userId))
                            .FirstOrDefault();

                        if (wallet is null)
                            throw new NotFoundException("Không tìm thấy ví.");

                        wallet.Balance += refundAmount;
                        _unitOfWork.Wallets.Update(wallet);
                        _unitOfWork.WalletTransactions.Add(new WalletTransaction
                        {
                            WalletId = wallet.Id,
                            TransactionType = TransactionType.Refund,
                            Direction = TransactionDirection.Credit,
                            Amount = refundAmount,
                            ReferenceId = booking.Id
                        });
                    }

                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();

                    _logger.LogInformation(
                        "Booking {BookingId} cancelled by user {UserId}. Refund: {RefundPercentage}% = {RefundAmount}",
                        bookingId, userId, refundPercentage, refundAmount);
                }
                catch
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    throw;
                }
            });
            return true;
        }

        /// <summary>
        /// Gets the earliest start time from booking details.
        /// Combines BookingDate + TimeSlot.StartTime.
        /// </summary>
        private static DateTime GetBookingStartTime(Booking booking)
        {
            var earliestDetail = booking.BookingDetails
                .OrderBy(d => d.TimeSlot!.StartTime)
                .First();

            return booking.BookingDate
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

        // ================================================================
        //   UC-59: Owner Cancel Booking
        // ================================================================

        public async Task<bool> OwnerCancelBookingAsync(int bookingId, string ownerId, string cancelReason, string? userRole)
        {
            if (userRole == null)
            {
                throw new ForbiddenException("Bạn không có quyền để thực hiện hành động này.");
            }

            // 1. Load booking with details and venue
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);

            if (booking is null)
                throw new NotFoundException("Không tìm thấy lịch đặt");
            if (userRole == AppRoles.FieldStaff)
            {
                var permission = (await _unitOfWork.VenueStaffs.FindAsync(s => s.StaffId == ownerId && s.VenueId == booking.VenueId)).Any();
                if (!permission)
                {
                    throw new ForbiddenException("Bạn không có quyền để hủy lịch đặt này.");
                }
            }
            else if (userRole == AppRoles.FieldOwner)
            {
                if (booking.Venue.OwnerId != ownerId)
                    throw new ForbiddenException("Bạn không có quyền để hủy lịch đặt này");
            }
            // E1: Booking must be in Booked status
            if (booking.Status != BookingStatus.Booked)
                throw new BadRequestException("Không thể hủy lịch đặt này do trạng thái không còn hợp lệ.");

            // BR-44: Can only cancel before the booking start time
            var bookingStartTime = GetBookingStartTime(booking);
            if (DateTime.Now >= bookingStartTime)
                throw new BadRequestException("Không thể hủy lịch đặt này do trạng thái không còn hợp lệ.");

            // BR-45: 100% refund
            var refundAmount = booking.TotalPrice;

            // Reload tracked entity for updates
            var trackedBooking = (await _unitOfWork.Bookings
                .FindAsync(b => b.Id == bookingId))
                .FirstOrDefault()!;

            // E2: Refund transaction with rollback on failure
            await _unitOfWork.ExecuteStrategyAsync(async () =>
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    // Update booking status + reason
                    trackedBooking.Status = BookingStatus.OwnerCancelled;
                    trackedBooking.UpdatedAt = DateTime.Now;
                    _unitOfWork.Bookings.Update(trackedBooking);
                    _unitOfWork.CancelBooking.Add(new CancelBooking
                    {
                        BookingId = bookingId,
                        CancelReason = cancelReason,
                        RefundAmount = refundAmount
                    });

                    // BR-46: Refund to customer's wallet
                    if (refundAmount > 0)
                    {
                        var customerWallet = (await _unitOfWork.Wallets
                            .FindAsync(w => w.UserId == booking.UserId))
                            .FirstOrDefault();

                        if (customerWallet is null)
                            throw new NotFoundException("Không tìm thấy ví.");

                        customerWallet.Balance += refundAmount;
                        _unitOfWork.Wallets.Update(customerWallet);

                        // Create refund transaction record
                        _unitOfWork.WalletTransactions.Add(new WalletTransaction
                        {
                            WalletId = customerWallet.Id,
                            TransactionType = TransactionType.Refund,
                            Direction = TransactionDirection.Credit,
                            Amount = refundAmount,
                            ReferenceId = booking.Id
                        });
                    }

                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();
                }
                catch (Exception ex)
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    _logger.LogError(ex,
                        "Refund failed for booking {BookingId} cancelled by owner {OwnerId}",
                        bookingId, ownerId);
                    throw new BadRequestException("Đã xảy ra lỗi hệ thống khi xử lý hoàn tiền. Vui lòng thử lại sau.");
                }
            });

            _logger.LogInformation(
                "Booking {BookingId} cancelled by owner {OwnerId}. Refund 100% = {RefundAmount}. Reason: {Reason}",
                bookingId, ownerId, refundAmount, cancelReason);

            // Notify the customer
            try
            {
                if (booking.BookingType != BookingType.Online)
                {
                    await _notificationService.NotifyBookingCancelledByOwnerAsync(
                    booking.UserId, bookingId, cancelReason, refundAmount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to send cancellation notification for booking {BookingId} to user {UserId}",
                    bookingId, booking.UserId);
            }

            return true;
        }

        public async Task<OwnerBookingDetailResponse?> GetBookingDetailForOwnerAsync(int bookingId, string ownerId)
        {
            var booking = await _unitOfWork.Bookings.GetBookingDetailForOwnerAsync(bookingId);

            if (booking == null)
            {
                throw new NotFoundException("Không tìm thấy lịch đặt");
            }
            if (booking.Venue.OwnerId != ownerId)
            {
                throw new ForbiddenException("Bạn không có quyền để xem lịch đặt này");
            }

            return new OwnerBookingDetailResponse
            {
                BookingId = booking.Id,
                CustomerName = booking.Fullname,
                PhoneNumber = booking.PhoneNumber,
                Status = booking.Status.ToString(),
                BookingNote = booking.BookingNote,
                TotalPrice = booking.TotalPrice,
                CreatedAt = booking.CreatedAt,
                CancelReason = booking.CancelBooking?.CancelReason,
                BookedItems = booking.BookingDetails.Select(bd => new DetailItemResponse
                {
                    FieldName = bd.Field?.Name ?? "N/A",
                    PlayDate = bd.Booking.BookingDate,
                    StartTime = bd.TimeSlot?.StartTime ?? default,
                    EndTime = bd.TimeSlot?.EndTime ?? default,
                    Price = bd.Price
                }).ToList(),
                Services = booking.BookingServiceItems.Select(si => new BookingServiceItemResponse
                {
                    ServiceName = si.VenueServiceItem.Name,
                    Quantity = si.Quantity,
                    Price = si.Price
                }).ToList()
            };
        }

        public async Task<PagedResult<OwnerBookingListResponse>> GetBookingListForOwnerAsync(string ownerId, OwnerBookingFilter parameters)
        {
            var domainFilter = new Fiebo.Domain.Shared.OwnerBookingHistoryFilter
            {
                BookingId = parameters.BookingId,
                VenueId = parameters.VenueId,
                VenueName = parameters.VenueName,
                FieldName = parameters.FieldName,
                FromDate = parameters.FromDate,
                ToDate = parameters.ToDate,
                Status = parameters.Status,
                PageNumber = parameters.PageNumber,
                PageSize = parameters.PageSize
            };
            var result = await _unitOfWork.Bookings.GetBookingListForOwnerAsync(ownerId, domainFilter);

            var items = result.Items.Select(b => new OwnerBookingListResponse
            {
                BookingId = b.Id,
                CustomerName = b.Fullname,
                PhoneNumber = b.PhoneNumber,
                BookingDate = b.BookingDate,
                VenueName = b.Venue?.Name ?? "N/A",
                FieldNames = b.BookingDetails.Select(bd => bd.Field?.Name ?? "N/A").Distinct().ToList(),
                TotalPrice = b.TotalPrice,
                Status = b.Status.ToString(),
                CreatedAt = b.CreatedAt
            }).ToList();

            return new PagedResult<OwnerBookingListResponse>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = items
            };
        }

        // ================================================================
        //   Owner Confirm Booking
        // ================================================================
        public async Task<bool> ConfirmBookingAsync(int bookingId, string ownerId, string? userRole)
        {
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);

            if (booking is null)
                throw new NotFoundException("Không tìm thấy lịch đặt");
            if (userRole == AppRoles.FieldStaff)
            {
                var permission = (await _unitOfWork.VenueStaffs.FindAsync(s => s.StaffId == ownerId && s.VenueId == booking.VenueId)).Any();
                if (!permission)
                {
                    throw new ForbiddenException("Bạn không có quyền để xác nhận lịch đặt này.");
                }
            }
            else if (userRole == AppRoles.FieldOwner)
            {
                if (booking.Venue.OwnerId != ownerId)
                    throw new ForbiddenException("Bạn không có quyền xác nhận lịch đặt này");
            }

            if (booking.Status != BookingStatus.Pending)
                throw new BadRequestException("Chỉ có thể xác nhận lịch đặt đang chờ xác nhận.");

            var trackedBooking = (await _unitOfWork.Bookings.FindAsync(b => b.Id == bookingId)).First();
            trackedBooking.Status = BookingStatus.Booked;
            trackedBooking.ConfirmExpiredAt = null;
            trackedBooking.UpdatedAt = DateTime.Now;
            _unitOfWork.Bookings.Update(trackedBooking);
            await _unitOfWork.SaveChangesAsync();

            try
            {
                await _notificationService.NotifyBookingConfirmedAsync(booking.UserId, bookingId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify customer for confirmed booking {BookingId}", bookingId);
            }

            return true;
        }

        // ================================================================
        //   Owner Reject Booking (+ Refund)
        // ================================================================
        public async Task<bool> RejectBookingAsync(int bookingId, string ownerId, string rejectReason, string? userRole)
        {
            var booking = await _unitOfWork.Bookings.GetBookingDetailByBookingId(bookingId);

            if (booking is null)
                throw new NotFoundException("Không tìm thấy lịch đặt");

            if (userRole == AppRoles.FieldStaff)
            {
                var permission = (await _unitOfWork.VenueStaffs.FindAsync(s => s.StaffId == ownerId && s.VenueId == booking.VenueId)).Any();
                if (!permission)
                {
                    throw new ForbiddenException("Bạn không có quyền để từ chối lịch đặt này.");
                }
            }
            else if (userRole == AppRoles.FieldOwner)
            {
                if (booking.Venue.OwnerId != ownerId)
                    throw new ForbiddenException("Bạn không có quyền từ chối lịch đặt này");
            }

            if (booking.Status != BookingStatus.Pending)
                throw new BadRequestException("Chỉ có thể từ chối lịch đặt đang chờ xác nhận.");

            var refundAmount = booking.TotalPrice;

            var trackedBooking = (await _unitOfWork.Bookings.FindAsync(b => b.Id == bookingId)).First();

            await _unitOfWork.ExecuteStrategyAsync(async () =>
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    trackedBooking.Status = BookingStatus.Rejected;
                    trackedBooking.ConfirmExpiredAt = null;
                    trackedBooking.UpdatedAt = DateTime.Now;
                    _unitOfWork.Bookings.Update(trackedBooking);

                    _unitOfWork.CancelBooking.Add(new CancelBooking
                    {
                        BookingId = bookingId,
                        CancelReason = rejectReason,
                        RefundAmount = refundAmount
                    });

                    if (refundAmount > 0 && !string.IsNullOrEmpty(booking.UserId))
                    {
                        var customerWallet = (await _unitOfWork.Wallets
                            .FindAsync(w => w.UserId == booking.UserId))
                            .FirstOrDefault();

                        if (customerWallet is null)
                            throw new NotFoundException("Không tìm thấy ví khách hàng.");

                        customerWallet.Balance += refundAmount;
                        _unitOfWork.Wallets.Update(customerWallet);

                        _unitOfWork.WalletTransactions.Add(new WalletTransaction
                        {
                            WalletId = customerWallet.Id,
                            TransactionType = TransactionType.Refund,
                            Direction = TransactionDirection.Credit,
                            Amount = refundAmount,
                            ReferenceId = bookingId
                        });
                    }

                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();
                }
                catch (Exception ex)
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    _logger.LogError(ex, "Refund failed for rejected booking {BookingId}", bookingId);
                    throw new BadRequestException("Đã xảy ra lỗi khi xử lý hoàn tiền. Vui lòng thử lại.");
                }
            });

            try
            {
                await _notificationService.NotifyBookingRejectedAsync(booking.UserId, bookingId, rejectReason, refundAmount);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify customer for rejected booking {BookingId}", bookingId);
            }

            return true;
        }

        public async Task FinalizeBookingsAsync(DateTime now)
        {
            var bookings = await _unitOfWork.Bookings
                .FindAsync(b => b.Status == BookingStatus.Booked);

            foreach (var booking in bookings)
            {
                var details = await _unitOfWork.BookingDetails
                    .FindAsync(x => x.BookingId == booking.Id);

                bool allFinished = true;

                foreach (var d in details)
                {
                    var slot = await _unitOfWork.TimeSlots.GetByIdAsync(d.SlotId);

                    var slotEnd = booking.BookingDate.ToDateTime(slot.EndTime);

                    if (slotEnd > now)
                    {
                        allFinished = false;
                        break;
                    }
                }

                if (allFinished)
                {
                    booking.Status = BookingStatus.Completed;
                }
            }

            await _unitOfWork.SaveChangesAsync();
        }
    }
}
