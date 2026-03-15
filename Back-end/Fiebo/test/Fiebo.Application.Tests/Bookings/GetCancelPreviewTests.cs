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
    public class GetCancelPreviewTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IBookingRepository> _bookingRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepo = new();

        private readonly BookingService _service;

        public GetCancelPreviewTests()
        {
            _unitOfWork.Setup(x => x.Bookings).Returns(_bookingRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingDetailRepo.Object);

            _service = new BookingService(_unitOfWork.Object, null!, null!, null!, null!, null!, null!);
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenBookingNotFound()
        {
            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((Booking)null!);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.GetCancelPreviewAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserNotOwner()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user2",
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _service.GetCancelPreviewAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenBookingNotBooked()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Cancelled,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.GetCancelPreviewAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ReturnPreview_WhenValid()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Booked,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
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

            var result = await _service.GetCancelPreviewAsync(1, "user1");

            Assert.Contains("hoàn lại", result);
        }
    }
}