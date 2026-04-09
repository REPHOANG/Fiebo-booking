using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.TimeSlots
{
    public class UpdateTimeSlotTests
    {
        private readonly IFixture _fixture;

        public UpdateTimeSlotTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private TimeSlotService CreateService()
        {
            return _fixture.Create<TimeSlotService>();
        }

        private void SetupRepositories(Mock<ITimeSlotRepository> timeSlotRepoMock, Mock<IVenueRepository> venueRepoMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            uowMock.Setup(x => x.TimeSlots).Returns(timeSlotRepoMock.Object);
            uowMock.Setup(x => x.Venues).Returns(venueRepoMock.Object);
            uowMock.Setup(x => x.BookingDetails).Returns(bookingDetailRepoMock.Object);

            timeSlotRepoMock
                .Setup(x => x.CanBeEditedOrDeleted(It.IsAny<int>()))
                .ReturnsAsync(true);

            bookingDetailRepoMock
                .Setup(x => x.FindAsync(It.IsAny<System.Linq.Expressions.Expression<Func<BookingDetail, bool>>>() ))
                .ReturnsAsync(Enumerable.Empty<BookingDetail>());
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenTimeSlotNotFound()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((TimeSlot?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenVenueNotFound()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ExistingTimeSlot());

            venueRepoMock
                .Setup(x => x.GetByIdAsync(10))
                .ReturnsAsync((Venue?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerMismatch()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(ExistingTimeSlot());
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, ValidRequest(), "owner-2"));
        }

        [Theory]
        [InlineData(10, 0, 10, 0)]
        [InlineData(11, 0, 10, 30)]
        public async Task Should_ThrowBadRequest_WhenStartTimeNotBeforeEndTime(int startHour, int startMinute, int endHour, int endMinute)
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(ExistingTimeSlot());
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Theory]
        [InlineData(7, 30, 8, 30)]
        [InlineData(21, 30, 22, 30)]
        public async Task Should_ThrowBadRequest_WhenOutsideVenueOpenCloseTime(int startHour, int startMinute, int endHour, int endMinute)
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(ExistingTimeSlot());
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenTimeSlotAlreadyDeleted()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            var deletedSlot = ExistingTimeSlot();
            deletedSlot.IsDeleted = true;

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(deletedSlot);
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenDurationLessThan30Minutes()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(ExistingTimeSlot());
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(10, 0);
            request.EndTime = new TimeOnly(10, 29);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Theory]
        [InlineData(10, 15, 11, 0)]
        [InlineData(10, 0, 10, 45)]
        public async Task Should_ThrowBadRequest_WhenTimeNotOn30MinuteMark(int startHour, int startMinute, int endHour, int endMinute)
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(ExistingTimeSlot());
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Fact]
        public async Task Should_ReturnExistingSlot_WhenNoChange()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            var existing = ExistingTimeSlot();
            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(existing);
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));

            var request = new UpdateVenueTimeSlotRequest
            {
                StartTime = existing.StartTime,
                EndTime = existing.EndTime,
                Price = existing.Price
            };

            var service = CreateService();

            var result = await service.UpdateVenueTimeSlotAsync(1, request, "owner-1");

            Assert.Equal(existing.Id, result.Id);
            Assert.Equal(existing.StartTime, result.StartTime);
            Assert.Equal(existing.EndTime, result.EndTime);
            Assert.Equal(existing.Price, result.Price);

            timeSlotRepoMock.Verify(x => x.IsTimeSlotOverlapping(
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<DayOfWeek>(),
                It.IsAny<TimeOnly>(),
                It.IsAny<TimeOnly>(),
                It.IsAny<int?>()), Times.Never);

            timeSlotRepoMock.Verify(x => x.Add(It.IsAny<TimeSlot>()), Times.Never);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Never);
            Assert.False(existing.IsDeleted);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenOverlapDetected()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            var existing = ExistingTimeSlot();
            var request = ValidRequest();

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(existing);
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));
            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(10, existing.SportTypeId, existing.DayOfWeek, request.StartTime, request.EndTime, 1))
                .ReturnsAsync(true);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateVenueTimeSlotAsync(1, request, "owner-1"));

            timeSlotRepoMock.Verify(x => x.Add(It.IsAny<TimeSlot>()), Times.Never);
        }

        [Fact]
        public async Task Should_UpdateBySoftDeleteAndAddNewSlot_WhenValid()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var bookingDetailRepoMock = _fixture.Freeze<Mock<IBookingDetailRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            var existing = ExistingTimeSlot();
            var request = new UpdateVenueTimeSlotRequest
            {
                StartTime = new TimeOnly(10, 30),
                EndTime = new TimeOnly(11, 30),
                Price = 220000m
            };

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(existing);
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));
            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(10, existing.SportTypeId, existing.DayOfWeek, request.StartTime, request.EndTime, 1))
                .ReturnsAsync(false);

            bookingDetailRepoMock
                .Setup(x => x.FindAsync(It.IsAny<System.Linq.Expressions.Expression<Func<BookingDetail, bool>>>() ))
                .ReturnsAsync(new List<BookingDetail> { new BookingDetail { SlotId = 1 } });

            TimeSlot? added = null;
            timeSlotRepoMock
                .Setup(x => x.Add(It.IsAny<TimeSlot>()))
                .Callback<TimeSlot>(slot =>
                {
                    slot.Id = 99;
                    added = slot;
                });

            var service = CreateService();
            var result = await service.UpdateVenueTimeSlotAsync(1, request, "owner-1");

            Assert.True(existing.IsDeleted);
            Assert.NotNull(added);
            Assert.Equal(10, added.VenueId);
            Assert.Equal(existing.SportTypeId, added.SportTypeId);
            Assert.Equal(existing.DayOfWeek, added.DayOfWeek);
            Assert.Equal(request.StartTime, added.StartTime);
            Assert.Equal(request.EndTime, added.EndTime);
            Assert.Equal(request.Price, added.Price);

            Assert.Equal(99, result.Id);
            Assert.Equal(request.StartTime, result.StartTime);
            Assert.Equal(request.EndTime, result.EndTime);
            Assert.Equal(request.Price, result.Price);
            Assert.Equal(existing.DayOfWeek.ToString(), result.DayOfWeek);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Should_Update_WhenUsingBoundaryTimes()
        {
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            SetupRepositories(timeSlotRepoMock, venueRepoMock);

            var existing = ExistingTimeSlot();
            var request = new UpdateVenueTimeSlotRequest
            {
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(8, 30),
                Price = 100000m
            };

            timeSlotRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(existing);
            venueRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ActiveVenue("owner-1"));
            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(10, existing.SportTypeId, existing.DayOfWeek, request.StartTime, request.EndTime, 1))
                .ReturnsAsync(false);

            var service = CreateService();
            var result = await service.UpdateVenueTimeSlotAsync(1, request, "owner-1");

            Assert.Equal(new TimeOnly(8, 0), result.StartTime);
            Assert.Equal(new TimeOnly(8, 30), result.EndTime);
            Assert.Equal("Monday", result.DayOfWeek);
        }

        private static UpdateVenueTimeSlotRequest ValidRequest()
        {
            return new UpdateVenueTimeSlotRequest
            {
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                Price = 200000m
            };
        }

        private static TimeSlot ExistingTimeSlot()
        {
            return new TimeSlot
            {
                Id = 1,
                VenueId = 10,
                SportTypeId = 1,
                DayOfWeek = DayOfWeek.Monday,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Price = 180000m,
                IsDeleted = false
            };
        }

        private static Venue ActiveVenue(string ownerId)
        {
            return new Venue
            {
                Id = 10,
                Name = "Venue A",
                OwnerId = ownerId,
                OpenTime = new TimeOnly(8, 0),
                CloseTime = new TimeOnly(22, 0)
            };
        }
    }
}
