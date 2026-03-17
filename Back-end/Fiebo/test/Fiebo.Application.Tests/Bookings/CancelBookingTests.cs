using System;
using System.Threading.Tasks;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Bookings
{
    public class CancelBookingTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IBookingRepository> _bookingRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepo = new();
        private readonly Mock<IWalletRepository> _walletRepo = new();

        private readonly BookingService _service;

        public CancelBookingTests()
        {
            _unitOfWork.Setup(x => x.Bookings).Returns(_bookingRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingDetailRepo.Object);
            _unitOfWork.Setup(x => x.Wallets).Returns(_walletRepo.Object);

            _service = new BookingService(_unitOfWork.Object, null!, null!, null!, null!, null!, null!, null!);
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenBookingNotFound()
        {
            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((Booking)null!);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.CancelBookingAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserNotOwner()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user2",
                Fullname = "Tuan",
                PhoneNumber = "0123456789"
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _service.CancelBookingAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_CancelBooking_AndRefundWallet_WhenValid()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Booked,
                TotalPrice = 1000,
                Fullname = "Tuan",
                PhoneNumber = "0123456789"
            };

            var wallet = new Wallet
            {
                UserId = "user1",
                Balance = 0
            };

            var detail = new BookingDetail
            {
                BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
                TimeSlot = new TimeSlot
                {
                    StartTime = new TimeOnly(8, 0, 0)
                }
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            _bookingDetailRepo.Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(detail);

            _walletRepo.Setup(x => x.GetByUserId("user1"))
                .ReturnsAsync(wallet);

            _unitOfWork.Setup(x => x.SaveChangesAsync())
                .ReturnsAsync(1);

            var result = await _service.CancelBookingAsync(1, "user1");

            Assert.True(result);
            Assert.Equal(BookingStatus.Cancelled, booking.Status);

            _bookingRepo.Verify(x => x.Update(booking), Times.Once);
            _walletRepo.Verify(x => x.Update(wallet), Times.Once);
            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
        }
    }
}