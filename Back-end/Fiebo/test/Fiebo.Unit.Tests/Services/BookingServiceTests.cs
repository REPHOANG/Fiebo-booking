using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using System.Linq.Expressions;

namespace Fiebo.Unit.Tests.Services
{
    public class BookingServiceTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IOtpService> _otpServiceMock;
        private readonly Mock<ISmsService> _smsServiceMock;
        private readonly Mock<ILogger<BookingService>> _loggerMock;
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ITokenService> _tokenServiceMock;
        private readonly Mock<ICacheService> _cacheServiceMock;

        private readonly Mock<IBookingRepository> _bookingRepoMock;
        private readonly Mock<IRepository<Wallet>> _walletRepoMock;
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepoMock;
        private readonly Mock<ITimeSlotRepository> _timeSlotRepoMock;

        private readonly BookingService _sut; // System Under Test

        public BookingServiceTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _otpServiceMock = new Mock<IOtpService>();
            _smsServiceMock = new Mock<ISmsService>();
            _loggerMock = new Mock<ILogger<BookingService>>();
            _identityServiceMock = new Mock<IIdentityService>();
            _tokenServiceMock = new Mock<ITokenService>();
            _cacheServiceMock = new Mock<ICacheService>();

            _bookingRepoMock = new Mock<IBookingRepository>();
            _walletRepoMock = new Mock<IRepository<Wallet>>();
            _bookingDetailRepoMock = new Mock<IBookingDetailRepository>();
            _timeSlotRepoMock = new Mock<ITimeSlotRepository>();

            _unitOfWorkMock.Setup(u => u.Bookings).Returns(_bookingRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Wallets).Returns(_walletRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.BookingDetails).Returns(_bookingDetailRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TimeSlots).Returns(_timeSlotRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);
            _unitOfWorkMock.Setup(u => u.BeginTransactionAsync()).Returns(Task.CompletedTask);
            _unitOfWorkMock.Setup(u => u.CommitTransactionAsync()).Returns(Task.CompletedTask);
            _unitOfWorkMock.Setup(u => u.RollbackTransactionAsync()).Returns(Task.CompletedTask);

            _sut = new BookingService(
                _unitOfWorkMock.Object,
                _otpServiceMock.Object,
                _smsServiceMock.Object,
                _loggerMock.Object,
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _cacheServiceMock.Object,
                null!);
        }

        // ========== Helper Methods ==========

        private Booking CreateTestBooking(
            int id = 1,
            string userId = "user-1",
            BookingStatus status = BookingStatus.Pending,
            decimal totalPrice = 100_000m,
            DateTime? expiredAt = null)
        {
            return new Booking
            {
                Id = id,
                UserId = userId,
                Fullname = "Test User",
                PhoneNumber = "0901234567",
                Status = status,
                TotalPrice = totalPrice,
                ExpiredAt = expiredAt ?? DateTime.UtcNow.AddMinutes(15)
            };
        }

        private Wallet CreateTestWallet(string userId = "user-1", decimal balance = 500_000m)
        {
            return new Wallet { Id = 1, UserId = userId, Balance = balance };
        }

        private void SetupBookingFound(Booking booking)
        {
            _bookingRepoMock
                .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });
        }

        private void SetupBookingNotFound()
        {
            _bookingRepoMock
                .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking>());
        }

        private void SetupWalletFound(Wallet wallet)
        {
            _walletRepoMock
                .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });
        }

        private void SetupWalletNotFound()
        {
            _walletRepoMock
                .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet>());
        }

        // ================================================================
        //   MakeBookingPaymentAsync
        // ================================================================

        [Fact]
        public async Task MakeBookingPayment_InvalidBookingId_ThrowsBadRequest()
        {
            var act = () => _sut.MakeBookingPaymentAsync(0, "user-1");

            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage("*greater than 0*");
        }

        [Fact]
        public async Task MakeBookingPayment_EmptyUserId_ThrowsUnauthorized()
        {
            var act = () => _sut.MakeBookingPaymentAsync(1, "");

            await act.Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task MakeBookingPayment_BookingNotFound_ThrowsNotFound()
        {
            SetupBookingNotFound();

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<NotFoundException>();
        }

        [Theory]
        [InlineData(BookingStatus.Booked)]
        [InlineData(BookingStatus.Completed)]
        [InlineData(BookingStatus.Cancelled)]
        [InlineData(BookingStatus.Expired)]
        public async Task MakeBookingPayment_InvalidStatus_ThrowsBadRequest(BookingStatus status)
        {
            var booking = CreateTestBooking(status: status);
            SetupBookingFound(booking);

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<BadRequestException>();
        }

        [Fact]
        public async Task MakeBookingPayment_BookingExpired_SetsExpiredStatusAndThrows()
        {
            var booking = CreateTestBooking(
                expiredAt: DateTime.UtcNow.AddMinutes(-5)); // expired 5 min ago
            SetupBookingFound(booking);

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage("*hết hạn*");

            booking.Status.Should().Be(BookingStatus.Expired);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task MakeBookingPayment_WalletNotFound_ThrowsNotFound()
        {
            var booking = CreateTestBooking();
            SetupBookingFound(booking);
            SetupWalletNotFound();

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<NotFoundException>()
                .WithMessage("*Wallet*");
        }

        [Fact]
        public async Task MakeBookingPayment_InsufficientBalance_ThrowsBadRequest()
        {
            var booking = CreateTestBooking(totalPrice: 200_000m);
            var wallet = CreateTestWallet(balance: 100_000m); // not enough
            SetupBookingFound(booking);
            SetupWalletFound(wallet);

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage("*Insufficient*");
        }

        [Fact]
        public async Task MakeBookingPayment_Success_DeductsWalletAndUpdatesBooking()
        {
            var booking = CreateTestBooking(totalPrice: 100_000m);
            var wallet = CreateTestWallet(balance: 500_000m);
            SetupBookingFound(booking);
            SetupWalletFound(wallet);

            var result = await _sut.MakeBookingPaymentAsync(1, "user-1");

            // Verify wallet deducted
            wallet.Balance.Should().Be(400_000m);

            // Verify booking status changed
            booking.Status.Should().Be(BookingStatus.Booked);
            booking.ExpiredAt.Should().BeNull();

            // Verify response
            result.BookingId.Should().Be(1);
            result.PaidAmount.Should().Be(100_000m);
            result.RemainingBalance.Should().Be(400_000m);
            result.BookingStatus.Should().Be("Booked");

            // Verify transaction was used
            _unitOfWorkMock.Verify(u => u.BeginTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.CommitTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.RollbackTransactionAsync(), Times.Never);
        }

        [Fact]
        public async Task MakeBookingPayment_SaveFails_RollsBackTransaction()
        {
            var booking = CreateTestBooking(totalPrice: 100_000m);
            var wallet = CreateTestWallet(balance: 500_000m);
            SetupBookingFound(booking);
            SetupWalletFound(wallet);

            _unitOfWorkMock
                .Setup(u => u.SaveChangesAsync())
                .ThrowsAsync(new Exception("DB error"));

            var act = () => _sut.MakeBookingPaymentAsync(1, "user-1");

            await act.Should().ThrowAsync<Exception>().WithMessage("DB error");

            _unitOfWorkMock.Verify(u => u.BeginTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.RollbackTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.CommitTransactionAsync(), Times.Never);
        }

        // ================================================================
        //   CreateBookingAsync (Hold Slot)
        // ================================================================

        [Fact]
        public async Task CreateBooking_LockFails_ThrowsConflictAndReleasesAcquiredLocks()
        {
            var request = new CreateBookingRequest
            {
                BookingDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Fullname = "Test",
                PhoneNumber = "0901234567",
                Details = new List<CreateBookingDetailRequest>
                {
                    new() { FieldId = 1, SlotId = 1 },
                    new() { FieldId = 1, SlotId = 2 }
                }
            };

            // First lock succeeds, second fails
            _cacheServiceMock
                .SetupSequence(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-value-1")
                .ReturnsAsync((string?)null); // second lock fails

            var act = () => _sut.CreateBookingAsync(request, "user-1");

            await act.Should().ThrowAsync<ResourceConflictException>();

            // Verify first lock was released
            _cacheServiceMock.Verify(
                c => c.ReleaseLockAsync(It.IsAny<string>(), "lock-value-1"),
                Times.Once);
        }

        [Fact]
        public async Task CreateBooking_SlotNotAvailable_ThrowsConflictAndReleasesLocks()
        {
            var request = new CreateBookingRequest
            {
                BookingDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Fullname = "Test",
                PhoneNumber = "0901234567",
                Details = new List<CreateBookingDetailRequest>
                {
                    new() { FieldId = 1, SlotId = 1 }
                }
            };

            _cacheServiceMock
                .Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-value-1");

            _bookingDetailRepoMock
                .Setup(r => r.IsSlotAvailable(1, 1, It.IsAny<DateOnly>()))
                .ReturnsAsync(false); // slot already booked

            var act = () => _sut.CreateBookingAsync(request, "user-1");

            await act.Should().ThrowAsync<ResourceConflictException>()
                .WithMessage("*đã được đặt*");

            // Lock must be released even on error
            _cacheServiceMock.Verify(
                c => c.ReleaseLockAsync(It.IsAny<string>(), "lock-value-1"),
                Times.Once);
        }

        [Fact]
        public async Task CreateBooking_Success_ReturnsHoldSlotResponseAndReleasesLocks()
        {
            var request = new CreateBookingRequest
            {
                BookingDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Fullname = "Test User",
                PhoneNumber = "0901234567",
                Details = new List<CreateBookingDetailRequest>
                {
                    new() { FieldId = 1, SlotId = 10 },
                    new() { FieldId = 2, SlotId = 20 }
                }
            };

            _cacheServiceMock
                .Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-value");

            _bookingDetailRepoMock
                .Setup(r => r.IsSlotAvailable(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(true);

            _timeSlotRepoMock
                .Setup(r => r.GetByIdAsync(10))
                .ReturnsAsync(new TimeSlot { Id = 10, Price = 80_000m });
            _timeSlotRepoMock
                .Setup(r => r.GetByIdAsync(20))
                .ReturnsAsync(new TimeSlot { Id = 20, Price = 120_000m });

            var result = await _sut.CreateBookingAsync(request, "user-1");

            // Verify response
            result.TotalPrice.Should().Be(200_000m);
            result.BookingStatus.Should().Be("Pending");
            result.ExpiredAt.Should().BeCloseTo(
                DateTime.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(5));

            // Verify booking was saved
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);

            // Verify booking entity was added
            _bookingRepoMock.Verify(r => r.Add(It.Is<Booking>(b =>
                b.UserId == "user-1" &&
                b.Fullname == "Test User" &&
                b.Status == BookingStatus.Pending)), Times.Once);

            // Verify booking details were added
            _bookingDetailRepoMock.Verify(
                r => r.AddRange(It.Is<IEnumerable<BookingDetail>>(
                    d => d.Count() == 2)), Times.Once);

            // Verify ALL locks released in finally block
            _cacheServiceMock.Verify(
                c => c.ReleaseLockAsync(It.IsAny<string>(), "lock-value"),
                Times.Exactly(2));
        }

        [Fact]
        public async Task CreateBooking_CalculatesTotalPriceCorrectly()
        {
            var request = new CreateBookingRequest
            {
                BookingDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Fullname = "Test",
                PhoneNumber = "0901234567",
                Details = new List<CreateBookingDetailRequest>
                {
                    new() { FieldId = 1, SlotId = 1 },
                    new() { FieldId = 1, SlotId = 2 },
                    new() { FieldId = 1, SlotId = 3 }
                }
            };

            _cacheServiceMock
                .Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lv");

            _bookingDetailRepoMock
                .Setup(r => r.IsSlotAvailable(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(true);

            _timeSlotRepoMock
                .Setup(r => r.GetByIdAsync(1))
                .ReturnsAsync(new TimeSlot { Id = 1, Price = 50_000m });
            _timeSlotRepoMock
                .Setup(r => r.GetByIdAsync(2))
                .ReturnsAsync(new TimeSlot { Id = 2, Price = 75_000m });
            _timeSlotRepoMock
                .Setup(r => r.GetByIdAsync(3))
                .ReturnsAsync(new TimeSlot { Id = 3, Price = 100_000m });

            var result = await _sut.CreateBookingAsync(request, "user-1");

            // 50k + 75k + 100k = 225k
            result.TotalPrice.Should().Be(225_000m);
        }
    }
}
