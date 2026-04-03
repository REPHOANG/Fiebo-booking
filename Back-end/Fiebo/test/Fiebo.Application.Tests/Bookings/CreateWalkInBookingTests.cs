using AutoFixture;
using AutoFixture.AutoMoq;
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
    public class CreateWalkInBookingTests
    {
        private readonly IFixture _fixture;

        public CreateWalkInBookingTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private BookingService CreateService()
        {
            return _fixture.Create<BookingService>();
        }

        private void SetupDependencies(
            Mock<IVenueRepository> venueRepoMock,
            Mock<IFieldRepository> fieldRepoMock,
            Mock<IBookingRepository> bookingRepoMock,
            Mock<IBookingDetailRepository> bookingDetailRepoMock,
            Mock<ITicketEventRepository> ticketEventRepoMock,
            Mock<ITimeSlotRepository> timeSlotRepoMock,
            Mock<ICacheService> cacheMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.Venues).Returns(venueRepoMock.Object);
            uowMock.Setup(x => x.Fields).Returns(fieldRepoMock.Object);
            uowMock.Setup(x => x.Bookings).Returns(bookingRepoMock.Object);
            uowMock.Setup(x => x.BookingDetails).Returns(bookingDetailRepoMock.Object);
            uowMock.Setup(x => x.TicketEvents).Returns(ticketEventRepoMock.Object);
            uowMock.Setup(x => x.TimeSlots).Returns(timeSlotRepoMock.Object);

            _fixture.Inject(cacheMock.Object);
            _fixture.Freeze<Mock<IOtpService>>();
            _fixture.Freeze<Mock<ISmsService>>();
            _fixture.Freeze<Mock<ILogger<BookingService>>>();
            _fixture.Freeze<Mock<IIdentityService>>();
            _fixture.Freeze<Mock<ITokenService>>();
            _fixture.Freeze<Mock<INotificationService>>();
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenVenueNotFound()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync((Venue?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateWalkInBookingAsync(ValidRequest(), "user-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenVenueInactive()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new Venue
            {
                Id = 1,
                Name = "Venue",
                OwnerId = "owner-1",
                Status = VenueStatus.Inactive
            });

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateWalkInBookingAsync(ValidRequest(), "user-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenAnyFieldNotFound()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);
            fieldRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync((Field?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateWalkInBookingAsync(ValidRequest(), "user-1"));
        }

        [Fact]
        public async Task Should_ValidateUniqueFieldOnlyOnce_WhenDuplicateFieldIds()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = new DateOnly(2026, 6, 15),
                Fullname = "A",
                PhoneNumber = "0900000000",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 },
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 101 }
                ]
            };

            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);
            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync((string?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.CreateWalkInBookingAsync(request, "user-1"));

            fieldRepoMock.Verify(x => x.GetByIdAsync(10), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenCannotAcquireFirstLock()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);
            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync((string?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.CreateWalkInBookingAsync(ValidRequest(), "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task Should_ReleaseAcquiredLock_WhenSecondLockFails()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = new DateOnly(2026, 6, 15),
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 },
                    new CreateBookingDetailRequest { FieldId = 11, SlotId = 101 }
                ]
            };

            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);
            fieldRepoMock.Setup(x => x.GetByIdAsync(11)).ReturnsAsync(new Field
            {
                Id = 11,
                Name = "Field B",
                VenueId = 1,
                SportTypeId = 1,
                Status = FieldStatus.Active
            });

            var call = 0;
            cacheMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync(() =>
                {
                    call++;
                    return call == 1 ? "lock-1" : null;
                });

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.CreateWalkInBookingAsync(request, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock-1"), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenSlotAlreadyBooked()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = ValidRequest();
            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);

            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            bookingDetailRepoMock.Setup(x => x.IsSlotAvailable(100, 10, request.BookingDate)).ReturnsAsync(false);

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.CreateWalkInBookingAsync(request, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenSlotUsedByEvent()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = ValidRequest();
            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);

            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            bookingDetailRepoMock.Setup(x => x.IsSlotAvailable(100, 10, request.BookingDate)).ReturnsAsync(true);
            ticketEventRepoMock.Setup(x => x.IsSlotUsedByEventAsync(10, 100, request.BookingDate)).ReturnsAsync(true);

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.CreateWalkInBookingAsync(request, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_CreateWalkInBooking_WhenValid()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = ValidRequest();
            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);

            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            bookingDetailRepoMock.Setup(x => x.IsSlotAvailable(100, 10, request.BookingDate)).ReturnsAsync(true);
            ticketEventRepoMock.Setup(x => x.IsSlotUsedByEventAsync(10, 100, request.BookingDate)).ReturnsAsync(false);
            timeSlotRepoMock.Setup(x => x.GetByIdAsync(100)).ReturnsAsync(new TimeSlot { Id = 100, Price = 150000m });

            Booking? captured = null;
            bookingRepoMock.Setup(x => x.Add(It.IsAny<Booking>())).Callback<Booking>(b => captured = b);

            List<BookingDetail>? capturedDetails = null;
            bookingDetailRepoMock
                .Setup(x => x.AddRange(It.IsAny<IEnumerable<BookingDetail>>()))
                .Callback<IEnumerable<BookingDetail>>(d => capturedDetails = d.ToList());

            var service = CreateService();
            var result = await service.CreateWalkInBookingAsync(request, "user-1");

            Assert.True(result);
            Assert.NotNull(captured);
            Assert.Equal(BookingType.WalkIn, captured.BookingType);
            Assert.Equal(BookingStatus.Booked, captured.Status);
            Assert.Equal(150000m, captured.TotalPrice);

            Assert.NotNull(capturedDetails);
            Assert.Single(capturedDetails);
            Assert.Equal(150000m, capturedDetails[0].Price);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_ReleaseLock_WhenSaveChangesThrows()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, cacheMock);

            var request = ValidRequest();
            SetupActiveVenueAndFields(venueRepoMock, fieldRepoMock);

            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            bookingDetailRepoMock.Setup(x => x.IsSlotAvailable(100, 10, request.BookingDate)).ReturnsAsync(true);
            ticketEventRepoMock.Setup(x => x.IsSlotUsedByEventAsync(10, 100, request.BookingDate)).ReturnsAsync(false);
            timeSlotRepoMock.Setup(x => x.GetByIdAsync(100)).ReturnsAsync(new TimeSlot { Id = 100, Price = 150000m });
            uowMock.Setup(x => x.SaveChangesAsync()).ThrowsAsync(new Exception("db error"));

            var service = CreateService();

            await Assert.ThrowsAsync<Exception>(async () =>
                await service.CreateWalkInBookingAsync(request, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        private static CreateBookingRequest ValidRequest()
        {
            return new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = new DateOnly(2026, 6, 15),
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                BookingNote = "walk in",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 }
                ]
            };
        }

        private static void SetupActiveVenueAndFields(
            Mock<IVenueRepository> venueRepoMock,
            Mock<IFieldRepository> fieldRepoMock)
        {
            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new Venue
            {
                Id = 1,
                Name = "Venue A",
                OwnerId = "owner-1",
                Status = VenueStatus.Active
            });

            fieldRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(new Field
            {
                Id = 10,
                Name = "Field A",
                VenueId = 1,
                SportTypeId = 1,
                Status = FieldStatus.Active
            });
        }
    }
}
