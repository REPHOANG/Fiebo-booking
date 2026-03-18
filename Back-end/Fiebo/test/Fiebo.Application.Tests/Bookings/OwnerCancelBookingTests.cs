using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Bookings
{
    public class OwnerCancelBookingTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IBookingRepository> _bookingRepo = new();
        private readonly Mock<IWalletRepository> _walletRepo = new();
        private readonly Mock<IWalletTransactionRepository> _walletTransactionRepo = new();
        private readonly Mock<INotificationService> _notificationService = new();
        private readonly Mock<ILogger<BookingService>> _logger = new();

        private readonly BookingService _service;

        private const string OwnerId = "owner1";
        private const string CustomerId = "customer1";
        private const string CancelReason = "Sân đang bảo trì";

        public OwnerCancelBookingTests()
        {
            _unitOfWork.Setup(x => x.Bookings).Returns(_bookingRepo.Object);
            _unitOfWork.Setup(x => x.Wallets).Returns(_walletRepo.Object);
            _unitOfWork.Setup(x => x.WalletTransactions).Returns(_walletTransactionRepo.Object);

            _service = new BookingService(
                _unitOfWork.Object,
                null!,
                null!,
                _logger.Object,
                null!,
                null!,
                null!,
                _notificationService.Object);
        }

        private Booking CreateBookingWithVenue(
            BookingStatus status = BookingStatus.Booked,
            string venueOwnerId = OwnerId,
            string customerId = CustomerId,
            decimal totalPrice = 200_000m,
            int daysFromNow = 2)
        {
            return new Booking
            {
                Id = 1,
                UserId = customerId,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                VenueId = 10,
                Status = status,
                TotalPrice = totalPrice,
                BookingType = BookingType.Online,
                Venue = new Venue
                {
                    Id = 10,
                    Name = "Sân Bóng ABC",
                    OwnerId = venueOwnerId
                },
                BookingDetails = new List<BookingDetail>
                {
                    new()
                    {
                        Id = 1,
                        BookingId = 1,
                        BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(daysFromNow)),
                        FieldId = 1,
                        SlotId = 1,
                        Price = totalPrice,
                        Field = new Field
                        {
                            Id = 1,
                            Name = "Sân 1",
                            SportTypeId = 1,
                            VenueId = 10
                        },
                        TimeSlot = new TimeSlot
                        {
                            Id = 1,
                            StartTime = new TimeOnly(8, 0),
                            EndTime = new TimeOnly(9, 0)
                        }
                    }
                }
            };
        }

        private void SetupFindBookingReturns(Booking booking)
        {
            _bookingRepo
                .Setup(x => x.FindAsync(It.IsAny<Expression<Func<Booking, bool>>>()))
                .ReturnsAsync(new List<Booking> { booking });
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenBookingDoesNotExist()
        {
            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync((Booking?)null);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerDoesNotOwnVenue()
        {
            var booking = CreateBookingWithVenue(venueOwnerId: "other-owner");
            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));
        }

        [Theory]
        [InlineData(BookingStatus.Pending)]
        [InlineData(BookingStatus.Completed)]
        [InlineData(BookingStatus.CustomerCancelled)]
        [InlineData(BookingStatus.OwnerCancelled)]
        [InlineData(BookingStatus.Expired)]
        public async Task Should_ThrowBadRequest_WhenBookingStatusIsNotBooked(BookingStatus status)
        {
            var booking = CreateBookingWithVenue(status: status);
            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));

            Assert.Equal("Không thể hủy lịch đặt này do trạng thái không còn hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenBookingStartTimeHasPassed()
        {
            var booking = CreateBookingWithVenue(daysFromNow: -1);
            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));

            Assert.Equal("Không thể hủy lịch đặt này do trạng thái không còn hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task Should_CancelBooking_RefundFull_AndNotifyCustomer_WhenValid()
        {
            var booking = CreateBookingWithVenue(totalPrice: 200_000m);
            var trackedBooking = new Booking
            {
                Id = 1,
                UserId = CustomerId,
                Status = BookingStatus.Booked,
                TotalPrice = 200_000m,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567"
            };
            var wallet = new Wallet { Id = 5, UserId = CustomerId, Balance = 100_000m };

            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);
            SetupFindBookingReturns(trackedBooking);
            _walletRepo
                .Setup(x => x.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });
            _unitOfWork.Setup(x => x.SaveChangesAsync()).ReturnsAsync(1);

            var result = await _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason);

            Assert.True(result);
            Assert.Equal(BookingStatus.OwnerCancelled, trackedBooking.Status);
            Assert.Equal(CancelReason, trackedBooking.CancelReason);
            Assert.Equal(300_000m, wallet.Balance);

            _unitOfWork.Verify(x => x.BeginTransactionAsync(), Times.Once);
            _unitOfWork.Verify(x => x.CommitTransactionAsync(), Times.Once);
            _bookingRepo.Verify(x => x.Update(trackedBooking), Times.Once);
            _walletRepo.Verify(x => x.Update(wallet), Times.Once);
            _walletTransactionRepo.Verify(x => x.Add(It.Is<WalletTransaction>(t =>
                t.WalletId == 5 &&
                t.Amount == 200_000m &&
                t.TransactionType == TransactionType.Refund &&
                t.Direction == TransactionDirection.Credit &&
                t.ReferenceId == 1
            )), Times.Once);

            _notificationService.Verify(x => x.NotifyBookingCancelledByOwnerAsync(
                CustomerId, 1, CancelReason, 200_000m), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenCustomerWalletNotFound()
        {
            var booking = CreateBookingWithVenue(totalPrice: 200_000m);
            var trackedBooking = new Booking
            {
                Id = 1,
                UserId = CustomerId,
                Status = BookingStatus.Booked,
                TotalPrice = 200_000m,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567"
            };

            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);
            SetupFindBookingReturns(trackedBooking);
            _walletRepo
                .Setup(x => x.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet>());

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));

            Assert.Equal("Đã xảy ra lỗi hệ thống khi xử lý hoàn tiền. Vui lòng thử lại sau.", ex.Message);
            _unitOfWork.Verify(x => x.RollbackTransactionAsync(), Times.Once);
        }

        [Fact]
        public async Task Should_RollbackTransaction_WhenSaveChangesFails()
        {
            var booking = CreateBookingWithVenue(totalPrice: 200_000m);
            var trackedBooking = new Booking
            {
                Id = 1,
                UserId = CustomerId,
                Status = BookingStatus.Booked,
                TotalPrice = 200_000m,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567"
            };
            var wallet = new Wallet { Id = 5, UserId = CustomerId, Balance = 100_000m };

            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);
            SetupFindBookingReturns(trackedBooking);
            _walletRepo
                .Setup(x => x.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });
            _unitOfWork
                .Setup(x => x.SaveChangesAsync())
                .ThrowsAsync(new Exception("DB error"));

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason));

            Assert.Equal("Đã xảy ra lỗi hệ thống khi xử lý hoàn tiền. Vui lòng thử lại sau.", ex.Message);
            _unitOfWork.Verify(x => x.RollbackTransactionAsync(), Times.Once);
            _unitOfWork.Verify(x => x.CommitTransactionAsync(), Times.Never);
        }

        [Fact]
        public async Task Should_StillSucceed_WhenNotificationFails()
        {
            var booking = CreateBookingWithVenue(totalPrice: 100_000m);
            var trackedBooking = new Booking
            {
                Id = 1,
                UserId = CustomerId,
                Status = BookingStatus.Booked,
                TotalPrice = 100_000m,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567"
            };
            var wallet = new Wallet { Id = 5, UserId = CustomerId, Balance = 0m };

            _bookingRepo
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);
            SetupFindBookingReturns(trackedBooking);
            _walletRepo
                .Setup(x => x.FindAsync(It.IsAny<Expression<Func<Wallet, bool>>>()))
                .ReturnsAsync(new List<Wallet> { wallet });
            _unitOfWork.Setup(x => x.SaveChangesAsync()).ReturnsAsync(1);

            _notificationService
                .Setup(x => x.NotifyBookingCancelledByOwnerAsync(
                    It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<decimal>()))
                .ThrowsAsync(new Exception("SSE connection lost"));

            var result = await _service.OwnerCancelBookingAsync(1, OwnerId, CancelReason);

            Assert.True(result);
            Assert.Equal(BookingStatus.OwnerCancelled, trackedBooking.Status);
            Assert.Equal(100_000m, wallet.Balance);
            _unitOfWork.Verify(x => x.CommitTransactionAsync(), Times.Once);
        }
    }
}
