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
    public class CreateTimeSlotTests
    {
        private readonly IFixture _fixture;

        public CreateTimeSlotTests()
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

        private void SetupRepositories(Mock<IVenueRepository> venueRepoMock, Mock<ITimeSlotRepository> timeSlotRepoMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.Venues).Returns(venueRepoMock.Object);
            uowMock.Setup(x => x.TimeSlots).Returns(timeSlotRepoMock.Object);
        }

        // =========================
        // INVALID
        // =========================

        [Fact]
        public async Task Should_ThrowNotFound_WhenVenueNotFound()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((Venue?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, ValidRequest(), "owner-1"));

            timeSlotRepoMock.Verify(x => x.Add(It.IsAny<TimeSlot>()), Times.Never);
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerMismatch()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, ValidRequest(), "other-owner"));
        }

        [Theory]
        [InlineData(10, 0, 10, 0)]
        [InlineData(11, 0, 10, 30)]
        public async Task Should_ThrowBadRequest_WhenStartTimeNotBeforeEndTime(int startHour, int startMinute, int endHour, int endMinute)
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, request, "owner-1"));

            timeSlotRepoMock.Verify(x => x.IsTimeSlotOverlapping(
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<DayOfWeek>(),
                It.IsAny<TimeOnly>(),
                It.IsAny<TimeOnly>(),
                It.IsAny<int?>()), Times.Never);
        }

        [Theory]
        [InlineData(7, 30, 8, 30)]
        [InlineData(21, 30, 22, 30)]
        public async Task Should_ThrowBadRequest_WhenOutsideVenueOpenCloseTime(int startHour, int startMinute, int endHour, int endMinute)
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenDurationLessThan30Minutes()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(10, 0);
            request.EndTime = new TimeOnly(10, 29);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Theory]
        [InlineData(10, 15, 10, 45)]
        [InlineData(10, 0, 10, 45)]
        public async Task Should_ThrowBadRequest_WhenTimeNotOn30MinuteMark(int startHour, int startMinute, int endHour, int endMinute)
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.StartTime = new TimeOnly(startHour, startMinute);
            request.EndTime = new TimeOnly(endHour, endMinute);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowException_WhenDayOfWeekInvalid()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = ValidRequest();
            request.DayOfWeek = "NotADay";

            var service = CreateService();

            await Assert.ThrowsAsync<Exception>(async () =>
                await service.CreateVenueTimeSlotAsync(1, request, "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenTimeSlotOverlaps()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(1, 1, DayOfWeek.Monday, new TimeOnly(10, 0), new TimeOnly(11, 0), null))
                .ReturnsAsync(true);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueTimeSlotAsync(1, ValidRequest(), "owner-1"));

            timeSlotRepoMock.Verify(x => x.Add(It.IsAny<TimeSlot>()), Times.Never);
        }

        // =========================
        // VALID + BOUNDARY + PATH
        // =========================

        [Fact]
        public async Task Should_CreateTimeSlot_WhenInputValid()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(1, 1, DayOfWeek.Monday, new TimeOnly(10, 0), new TimeOnly(11, 0), null))
                .ReturnsAsync(false);

            TimeSlot? captured = null;
            timeSlotRepoMock
                .Setup(x => x.Add(It.IsAny<TimeSlot>()))
                .Callback<TimeSlot>(ts =>
                {
                    ts.Id = 99;
                    captured = ts;
                });

            var service = CreateService();

            var result = await service.CreateVenueTimeSlotAsync(1, ValidRequest(), "owner-1");

            Assert.NotNull(captured);
            Assert.Equal(1, captured.VenueId);
            Assert.Equal(1, captured.SportTypeId);
            Assert.Equal(DayOfWeek.Monday, captured.DayOfWeek);
            Assert.Equal(new TimeOnly(10, 0), captured.StartTime);
            Assert.Equal(new TimeOnly(11, 0), captured.EndTime);
            Assert.Equal(150000m, captured.Price);

            Assert.Equal(99, result.Id);
            Assert.Equal("Monday", result.DayOfWeek);
            Assert.Equal(new TimeOnly(10, 0), result.StartTime);
            Assert.Equal(new TimeOnly(11, 0), result.EndTime);
            Assert.Equal(150000m, result.Price);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Should_CreateTimeSlot_AtOpenCloseBoundaries()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var timeSlotRepoMock = _fixture.Freeze<Mock<ITimeSlotRepository>>();
            SetupRepositories(venueRepoMock, timeSlotRepoMock);

            venueRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(ActiveVenue("owner-1"));

            var request = new CreateVenueTimeSlotRequest
            {
                SportTypeId = 1,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(22, 0),
                DayOfWeek = "monday",
                Price = 200000m
            };

            timeSlotRepoMock
                .Setup(x => x.IsTimeSlotOverlapping(1, 1, DayOfWeek.Monday, request.StartTime, request.EndTime, null))
                .ReturnsAsync(false);

            var service = CreateService();
            var result = await service.CreateVenueTimeSlotAsync(1, request, "owner-1");

            Assert.Equal(new TimeOnly(8, 0), result.StartTime);
            Assert.Equal(new TimeOnly(22, 0), result.EndTime);
            Assert.Equal("Monday", result.DayOfWeek);
        }

        private static CreateVenueTimeSlotRequest ValidRequest()
        {
            return new CreateVenueTimeSlotRequest
            {
                SportTypeId = 1,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                DayOfWeek = "Monday",
                Price = 150000m
            };
        }

        private static Venue ActiveVenue(string ownerId)
        {
            return new Venue
            {
                Id = 1,
                Name = "Venue A",
                OwnerId = ownerId,
                OpenTime = new TimeOnly(8, 0),
                CloseTime = new TimeOnly(22, 0)
            };
        }
    }
}
