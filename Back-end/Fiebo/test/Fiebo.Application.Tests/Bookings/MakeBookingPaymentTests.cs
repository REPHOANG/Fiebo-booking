using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Bookings
{
    public class MakeBookingPaymentTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IOtpService> _otpServiceMock;
        private readonly Mock<ISmsService> _smsServiceMock;
        private readonly Mock<ILogger<BookingService>> _loggerMock;
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ITokenService> _tokenServiceMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<INotificationService> _notificationServiceMock;

        private readonly Mock<IBookingRepository> _bookingRepoMock;
        private readonly Mock<IWalletRepository> _walletRepoMock;
        private readonly Mock<IWalletTransactionRepository> _walletTransactionRepoMock;
        private readonly BookingService _bookingService;

        public MakeBookingPaymentTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _otpServiceMock = new Mock<IOtpService>();
            _smsServiceMock = new Mock<ISmsService>();
            _loggerMock = new Mock<ILogger<BookingService>>();
            _identityServiceMock = new Mock<IIdentityService>();
            _tokenServiceMock = new Mock<ITokenService>();
            _cacheServiceMock = new Mock<ICacheService>();
            _notificationServiceMock = new Mock<INotificationService>();

            _bookingRepoMock = new Mock<IBookingRepository>();
            _walletRepoMock = new Mock<IWalletRepository>();
            _walletTransactionRepoMock = new Mock<IWalletTransactionRepository>();

            _unitOfWorkMock.Setup(u => u.Bookings).Returns(_bookingRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Wallets).Returns(_walletRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.WalletTransactions).Returns(_walletTransactionRepoMock.Object);

            _bookingService = new BookingService(
                _unitOfWorkMock.Object,
                _otpServiceMock.Object,
                _smsServiceMock.Object,
                _loggerMock.Object,
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _cacheServiceMock.Object,
                _notificationServiceMock.Object
            );
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_BadRequestException_When_BookingId_Is_Invalid()
        {
            // Arrange
            int bookingId = 0;
            string userId = "valid-id";

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không có dữ liệu hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedAccessException_When_UserId_Is_Null()
        {
            // Arrange
            int bookingId = 1;
            string userId = null;

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không thể định danh người dùng", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_NotFoundException_When_Booking_Not_Found()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking>());

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không tìm thấy lịch đặt", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_Booking_Status_Is_Booked()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking { Id = 1, UserId = userId, Fullname = "Test", PhoneNumber = "123", Status = BookingStatus.Booked };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không có dữ liệu hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_NotFoundException_When_Booking_Status_Is_Expired()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking { Id = 1, UserId = userId, Fullname = "Test", PhoneNumber = "123", Status = BookingStatus.Expired };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Thời gian giữ chỗ và thanh toán đã hết. Vui lòng đặt lại.", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_Booking_Is_Expired_By_Time()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking 
            { 
                Id = 1, 
                UserId = userId, 
                Fullname = "Test",
                PhoneNumber = "123",
                Status = BookingStatus.Holding, 
                ExpiredAt = DateTime.Now.AddMinutes(-1) 
            };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Thời gian giữ chỗ và thanh toán đã hết. Vui lòng đặt lại.", ex.Message);
            _bookingRepoMock.Verify(u => u.Update(It.IsAny<Booking>()), Times.Once);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_TotalPrice_Is_Invalid()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking { Id = 1, UserId = userId, Fullname = "Test", PhoneNumber = "123", Status = BookingStatus.Holding, TotalPrice = 0 };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không có dữ liệu hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Throw_NotFoundException_When_Wallet_Not_Found()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking { Id = 1, UserId = userId, Fullname = "Test", PhoneNumber = "123", Status = BookingStatus.Holding, TotalPrice = 50000 };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });
            
            _walletRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet>());

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không tìm thấy ví.", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_Balance_Is_Insufficient()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking { Id = 1, UserId = userId, Fullname = "Test", PhoneNumber = "123", Status = BookingStatus.Holding, TotalPrice = 50000 };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });
            
            var wallet = new Wallet { Id = 1, UserId = userId, Balance = 40000 };
            _walletRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.MakeBookingPaymentAsync(bookingId, userId));
            Assert.Equal("Không thể lấy số dư ví vào lúc này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Pay_Successfully_When_Valid_Data()
        {
            // Arrange
            int bookingId = 1;
            string userId = "valid-id";
            var booking = new Booking 
            { 
                Id = 1, 
                UserId = userId, 
                Fullname = "Test",
                PhoneNumber = "123",
                Status = BookingStatus.Holding, 
                TotalPrice = 50000,
                BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1))
            };
            _bookingRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });
            
            var wallet = new Wallet { Id = 1, UserId = userId, Balance = 100000 };
            _walletRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });

            var bookingWithDetails = new Booking
            {
                Id = 1,
                UserId = userId,
                Fullname = "Test",
                PhoneNumber = "123",
                BookingDetails = new List<BookingDetail>
                {
                    new BookingDetail 
                    { 
                        TimeSlot = new TimeSlot { StartTime = new TimeOnly(10, 0) } 
                    }
                }
            };
            _bookingRepoMock.Setup(u => u.GetBookingDetailByBookingId(1)).ReturnsAsync(bookingWithDetails);

            // Act
            var result = await _bookingService.MakeBookingPaymentAsync(bookingId, userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(bookingId, result.BookingId);
            Assert.Equal(50000, wallet.Balance);
            Assert.Equal(BookingStatus.Pending, booking.Status);
            
            _unitOfWorkMock.Verify(u => u.BeginTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.CommitTransactionAsync(), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.AtLeastOnce);
        }
    }
}
