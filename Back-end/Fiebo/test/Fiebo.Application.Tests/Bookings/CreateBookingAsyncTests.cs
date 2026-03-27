using Fiebo.Application.DTOs.Booking;
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
    public class CreateBookingAsyncTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
        private readonly Mock<IBookingRepository> _bookingRepoMock = new();
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepoMock = new();
        private readonly Mock<ITicketEventRepository> _ticketEventRepoMock = new();
        private readonly Mock<ITimeSlotRepository> _timeSlotRepoMock = new();

        private readonly Mock<IOtpService> _otpServiceMock = new();
        private readonly Mock<ISmsService> _smsServiceMock = new();
        private readonly Mock<IIdentityService> _identityServiceMock = new();
        private readonly Mock<ITokenService> _tokenServiceMock = new();
        private readonly Mock<ICacheService> _cacheServiceMock = new();
        private readonly Mock<ILogger<BookingService>> _loggerMock = new();

        private readonly BookingService _service;

        public CreateBookingAsyncTests()
        {
            _unitOfWorkMock.Setup(x => x.Bookings).Returns(_bookingRepoMock.Object);
            _unitOfWorkMock.Setup(x => x.BookingDetails).Returns(_bookingDetailRepoMock.Object);
            _unitOfWorkMock.Setup(x => x.TicketEvents).Returns(_ticketEventRepoMock.Object);
            _unitOfWorkMock.Setup(x => x.TimeSlots).Returns(_timeSlotRepoMock.Object);

            _service = new BookingService(
                _unitOfWorkMock.Object,
                _otpServiceMock.Object,
                _smsServiceMock.Object,
                _loggerMock.Object,
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _cacheServiceMock.Object,
                null!);
        }

        [Fact]
        public async Task Should_CreatePendingBooking_AndReturnHoldSlotResponse_WhenSlotsAvailable()
        {
            var bookingDate = new DateOnly(2026, 6, 15);
            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = bookingDate,
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                BookingNote = "note",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 },
                    new CreateBookingDetailRequest { FieldId = 11, SlotId = 101 }
                ]
            };

            _cacheServiceMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.Is<TimeSpan>(t => t == TimeSpan.FromSeconds(5))))
                .ReturnsAsync((string _, TimeSpan _) => "lock-token");

            _bookingDetailRepoMock
                .Setup(x => x.IsSlotAvailable(It.IsAny<int>(), It.IsAny<int>(), bookingDate))
                .ReturnsAsync(true);

            _ticketEventRepoMock
                .Setup(x => x.IsSlotUsedByEventAsync(It.IsAny<int>(), It.IsAny<int>(), bookingDate))
                .ReturnsAsync(false);

            _timeSlotRepoMock.Setup(x => x.GetByIdAsync(100)).ReturnsAsync(new TimeSlot { Id = 100, Price = 150_000 });
            _timeSlotRepoMock.Setup(x => x.GetByIdAsync(101)).ReturnsAsync(new TimeSlot { Id = 101, Price = 200_000 });

            _bookingRepoMock
                .Setup(x => x.Add(It.IsAny<Booking>()))
                .Callback<Booking>(b => b.Id = 42);

            _unitOfWorkMock.Setup(x => x.SaveChangesAsync()).ReturnsAsync(1);

            var result = await _service.CreateBookingAsync(request, "user-1");

            Assert.Equal(42, result.BookingId);
            Assert.Equal(350_000m, result.TotalPrice);
            Assert.Equal(BookingStatus.Pending.ToString(), result.BookingStatus);
            Assert.True(result.ExpiredAt > DateTime.Now);

            _bookingRepoMock.Verify(x => x.Add(It.Is<Booking>(b =>
                b.UserId == "user-1"
                && b.VenueId == 1
                && b.BookingType == BookingType.Online
                && b.Status == BookingStatus.Pending)), Times.Once);

            _bookingDetailRepoMock.Verify(x => x.AddRange(It.Is<List<BookingDetail>>(list =>
                list.Count == 2
                && list.Sum(d => d.Price) == 350_000m)), Times.Once);

            _unitOfWorkMock.Verify(x => x.SaveChangesAsync(), Times.Once);

            _cacheServiceMock.Verify(
                x => x.ReleaseLockAsync(It.IsAny<string>(), "lock-token"),
                Times.Exactly(2));
        }

        [Fact]
        public async Task Should_ThrowResourceConflict_WhenLockCannotBeAcquired()
        {
            var bookingDate = new DateOnly(2026, 6, 15);
            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = bookingDate,
                Fullname = "A",
                PhoneNumber = "0900000000",
                Details = [new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 }]
            };

            _cacheServiceMock
                .Setup(x => x.AcquireLockAsync(
                    "booking:lock:10:100:2026-06-15",
                    It.IsAny<TimeSpan>()))
                .ReturnsAsync((string?)null);

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateBookingAsync(request, "user-1"));

            _unitOfWorkMock.Verify(x => x.SaveChangesAsync(), Times.Never);
            _cacheServiceMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task Should_ReleaseAcquiredLocks_WhenSecondLockFails()
        {
            var bookingDate = new DateOnly(2026, 6, 15);
            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = bookingDate,
                Fullname = "A",
                PhoneNumber = "0900000000",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 },
                    new CreateBookingDetailRequest { FieldId = 20, SlotId = 200 }
                ]
            };

            var call = 0;
            _cacheServiceMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync(() =>
                {
                    call++;
                    return call == 1 ? "first-lock" : null;
                });

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateBookingAsync(request, "user-1"));

            _cacheServiceMock.Verify(
                x => x.ReleaseLockAsync(It.IsAny<string>(), "first-lock"),
                Times.Once);
        }

        [Fact]
        public async Task Should_ThrowResourceConflict_WhenSlotAlreadyBooked()
        {
            var bookingDate = new DateOnly(2026, 6, 15);
            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = bookingDate,
                Fullname = "A",
                PhoneNumber = "0900000000",
                Details = [new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 }]
            };

            _cacheServiceMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-token");

            _bookingDetailRepoMock
                .Setup(x => x.IsSlotAvailable(100, 10, bookingDate))
                .ReturnsAsync(false);

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateBookingAsync(request, "user-1"));

            _unitOfWorkMock.Verify(x => x.SaveChangesAsync(), Times.Never);
            _cacheServiceMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock-token"), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowResourceConflict_WhenSlotUsedByDropInEvent()
        {
            var bookingDate = new DateOnly(2026, 6, 15);
            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = bookingDate,
                Fullname = "A",
                PhoneNumber = "0900000000",
                Details = [new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 }]
            };

            _cacheServiceMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-token");

            _bookingDetailRepoMock
                .Setup(x => x.IsSlotAvailable(100, 10, bookingDate))
                .ReturnsAsync(true);

            _ticketEventRepoMock
                .Setup(x => x.IsSlotUsedByEventAsync(10, 100, bookingDate))
                .ReturnsAsync(true);

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateBookingAsync(request, "user-1"));

            _unitOfWorkMock.Verify(x => x.SaveChangesAsync(), Times.Never);
            _cacheServiceMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock-token"), Times.Once);
        }
    }
}
