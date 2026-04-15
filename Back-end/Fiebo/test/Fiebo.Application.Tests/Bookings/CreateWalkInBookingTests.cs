using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
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
            _fixture = new Fixture().Customize(new AutoMoqCustomization
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
            Mock<IVenueStaffRepository> venueStaffRepoMock,
            Mock<ICacheService> cacheMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.Venues).Returns(venueRepoMock.Object);
            uowMock.Setup(x => x.Fields).Returns(fieldRepoMock.Object);
            uowMock.Setup(x => x.Bookings).Returns(bookingRepoMock.Object);
            uowMock.Setup(x => x.BookingDetails).Returns(bookingDetailRepoMock.Object);
            uowMock.Setup(x => x.TicketEvents).Returns(ticketEventRepoMock.Object);
            uowMock.Setup(x => x.TimeSlots).Returns(timeSlotRepoMock.Object);
            uowMock.Setup(x => x.VenueStaffs).Returns(venueStaffRepoMock.Object);

            _fixture.Inject(cacheMock.Object);
            _fixture.Freeze<Mock<IOtpService>>();
            _fixture.Freeze<Mock<ISmsService>>();
            _fixture.Freeze<Mock<ILogger<BookingService>>>();
            _fixture.Freeze<Mock<IIdentityService>>();
            _fixture.Freeze<Mock<ITokenService>>();
            _fixture.Freeze<Mock<INotificationService>>();
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserIdIsNull()
        {
            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), null, AppRoles.FieldOwner));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenRoleIsNull()
        {
            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), "owner-1", null));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenFieldOwnerDoesNotOwnVenue()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new Venue
            {
                Id = 1,
                Name = "Venue A",
                Status = VenueStatus.Active,
                OwnerId = "owner-2"
            });

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), "owner-1", AppRoles.FieldOwner));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenFieldStaffNotAssignedToVenue()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new Venue
            {
                Id = 1,
                Name = "Venue A",
                Status = VenueStatus.Active,
                OwnerId = "owner-1"
            });
            venueStaffRepoMock
                .Setup(x => x.GetSingleAsync(It.IsAny<System.Linq.Expressions.Expression<Func<VenueStaff, bool>>>() ))
                .ReturnsAsync((VenueStaff?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), "staff-1", AppRoles.FieldStaff));
        }

        [Fact]
        public async Task Should_ReleaseFirstLock_WhenSecondLockFails()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            var request = ValidRequestWithTwoDetails();
            SetupValidCommonFlow(venueRepoMock, fieldRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock);

            var call = 0;
            cacheMock
                .Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync(() =>
                {
                    call++;
                    return call == 1 ? "lock-1" : null;
                });

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                service.CreateWalkInBookingAsync(request, "owner-1", AppRoles.FieldOwner));

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
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            SetupValidCommonFlow(venueRepoMock, fieldRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock);
            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            bookingDetailRepoMock
                .Setup(x => x.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (100, 10) });

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), "owner-1", AppRoles.FieldOwner));

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
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            SetupValidCommonFlow(venueRepoMock, fieldRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock);
            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock
                .Setup(x => x.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (100, 10) });

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                service.CreateWalkInBookingAsync(ValidRequest(), "owner-1", AppRoles.FieldOwner));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_CreateWalkInBooking_WhenRequestIsValid()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var bookingRepoMock = _fixture.Freeze<Mock<IBookingRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueStaffRepoMock = _fixture.Freeze<Mock<IVenueStaffRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupDependencies(venueRepoMock, fieldRepoMock, bookingRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock, venueStaffRepoMock, cacheMock);

            SetupValidCommonFlow(venueRepoMock, fieldRepoMock, bookingDetailRepoMock, ticketEventRepoMock, timeSlotRepoMock);
            cacheMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock");

            Booking? capturedBooking = null;
            bookingRepoMock.Setup(x => x.Add(It.IsAny<Booking>())).Callback<Booking>(b => capturedBooking = b);

            List<BookingDetail>? capturedDetails = null;
            bookingDetailRepoMock.Setup(x => x.AddRange(It.IsAny<IEnumerable<BookingDetail>>()))
                .Callback<IEnumerable<BookingDetail>>(d => capturedDetails = d.ToList());

            var service = CreateService();
            var result = await service.CreateWalkInBookingAsync(ValidRequest(), "owner-1", AppRoles.FieldOwner);

            Assert.True(result);
            Assert.NotNull(capturedBooking);
            Assert.Equal(BookingType.WalkIn, capturedBooking!.BookingType);
            Assert.Equal(BookingStatus.Booked, capturedBooking.Status);
            Assert.Equal(150000m, capturedBooking.TotalPrice);

            Assert.NotNull(capturedDetails);
            Assert.Single(capturedDetails!);
            Assert.Equal(150000m, capturedDetails[0].Price);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), "lock"), Times.Once);
        }

        private static CreateBookingRequest ValidRequest()
        {
            return new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                BookingNote = "walk in",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 }
                ]
            };
        }

        private static CreateBookingRequest ValidRequestWithTwoDetails()
        {
            return new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                BookingNote = "walk in",
                Details =
                [
                    new CreateBookingDetailRequest { FieldId = 10, SlotId = 100 },
                    new CreateBookingDetailRequest { FieldId = 11, SlotId = 101 }
                ]
            };
        }

        private static void SetupValidCommonFlow(
            Mock<IVenueRepository> venueRepoMock,
            Mock<IFieldRepository> fieldRepoMock,
            Mock<IBookingDetailRepository> bookingDetailRepoMock,
            Mock<ITicketEventRepository> ticketEventRepoMock,
            Mock<ITimeSlotRepository> timeSlotRepoMock)
        {
            venueRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new Venue
            {
                Id = 1,
                Name = "Venue A",
                OwnerId = "owner-1",
                Status = VenueStatus.Active
            });

            fieldRepoMock.Setup(x => x.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync((List<int> ids) =>
                ids.Select(id => new Field
                {
                    Id = id,
                    VenueId = 1,
                    Status = FieldStatus.Active,
                    Name = $"Field-{id}",
                    SportTypeId = 1
                }).ToList());

            timeSlotRepoMock.Setup(x => x.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync((List<int> ids) =>
                ids.Select(id => new TimeSlot
                {
                    Id = id,
                    VenueId = 1,
                    IsDeleted = false,
                    StartTime = new TimeOnly(10, 0),
                    EndTime = new TimeOnly(11, 0),
                    Price = 150000m
                }).ToList());

            bookingDetailRepoMock
                .Setup(x => x.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync([]);

            ticketEventRepoMock
                .Setup(x => x.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync([]);
        }
    }
}
