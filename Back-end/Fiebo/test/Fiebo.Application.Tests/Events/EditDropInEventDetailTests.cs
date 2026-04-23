using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Event;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Events
{
    public class EditDropInEventDetailTests
    {
        private readonly IFixture _fixture;

        public EditDropInEventDetailTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private EventService CreateService()
        {
            return _fixture.Create<EventService>();
        }

        private void SetupRepositories(
            Mock<ITicketEventRepository> ticketEventRepoMock,
            Mock<ITicketEventDetailRepository> ticketEventDetailRepoMock,
            Mock<ITicketParticipantRepository> ticketParticipantRepoMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.TicketEvents).Returns(ticketEventRepoMock.Object);
            uowMock.Setup(x => x.TicketEventsDetails).Returns(ticketEventDetailRepoMock.Object);
            uowMock.Setup(x => x.TicketParticipants).Returns(ticketParticipantRepoMock.Object);

            _fixture.Freeze<Mock<ILogger<EventService>>>();
            _fixture.Freeze<Mock<ICacheService>>();
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenEventNotFound()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((TicketEvent?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.UpdateDropInEventAsync(1, ValidRequest(), "owner-1"));

            ticketEventDetailRepoMock.Verify(x => x.GetEarliestDetailAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenEventHasNoSlot()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(PendingEvent(1));

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync((TicketEventDetail?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateDropInEventAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenOwnerMismatch()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(PendingEvent(1));

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(new TicketEventDetail { Id = 10, EventId = 1, FieldId = 1, SlotId = 1 });

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateDropInEventAsync(1, ValidRequest(), "owner-2"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenEventNotPending()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            var evt = PendingEvent(1);
            evt.Status = TicketEventStatus.Completed;

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(evt);

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(new TicketEventDetail { Id = 10, EventId = 1, FieldId = 1, SlotId = 1 });

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateDropInEventAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenEventAlreadyHasPlayers()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(PendingEvent(1));

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(new TicketEventDetail { Id = 10, EventId = 1, FieldId = 1, SlotId = 1 });

            ticketParticipantRepoMock
                .Setup(x => x.GetCurrentPlayer(1))
                .ReturnsAsync(1);

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateDropInEventAsync(1, ValidRequest(), "owner-1"));
        }

        [Fact]
        public async Task Should_UpdateEvent_WhenRequestValid()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            var evt = PendingEvent(1);
            var request = new UpdateEventRequest
            {
                PricePerPerson = 120000m,
                MinPlayer = 6,
                MaxPlayer = 12,
                Description = "Updated event"
            };

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(evt);

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(new TicketEventDetail { Id = 10, EventId = 1, FieldId = 1, SlotId = 1 });

            ticketParticipantRepoMock
                .Setup(x => x.GetCurrentPlayer(1))
                .ReturnsAsync(0);

            var service = CreateService();

            await service.UpdateDropInEventAsync(1, request, "owner-1");

            Assert.Equal(120000m, evt.PricePerPerson);
            Assert.Equal(6, evt.MinPlayer);
            Assert.Equal(12, evt.MaxPlayer);
            Assert.Equal("Updated event", evt.Description);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Should_UpdateEvent_WhenCurrentPlayerBoundaryIsZero()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var ticketEventDetailRepoMock = _fixture.Freeze<Mock<ITicketEventDetailRepository>>();
            var ticketParticipantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            SetupRepositories(ticketEventRepoMock, ticketEventDetailRepoMock, ticketParticipantRepoMock);

            var evt = PendingEvent(1);

            ticketEventRepoMock
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(evt);

            ticketEventDetailRepoMock
                .Setup(x => x.GetEarliestDetailAsync(1))
                .ReturnsAsync(new TicketEventDetail { Id = 10, EventId = 1, FieldId = 1, SlotId = 1 });

            ticketParticipantRepoMock
                .Setup(x => x.GetCurrentPlayer(1))
                .ReturnsAsync(0);

            var request = ValidRequest();
            var service = CreateService();

            await service.UpdateDropInEventAsync(1, request, "owner-1");

            Assert.Equal(request.PricePerPerson, evt.PricePerPerson);
            Assert.Equal(request.MinPlayer, evt.MinPlayer);
            Assert.Equal(request.MaxPlayer, evt.MaxPlayer);
            Assert.Equal(request.Description, evt.Description);
        }

        private static UpdateEventRequest ValidRequest()
        {
            return new UpdateEventRequest
            {
                PricePerPerson = 100000m,
                MinPlayer = 4,
                MaxPlayer = 10,
                Description = "Edit event"
            };
        }

        private static TicketEvent PendingEvent(int venueId)
        {
            return new TicketEvent
            {
                Id = 1,
                VenueId = venueId,
                EventDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
                PricePerPerson = 80000m,
                MinPlayer = 4,
                MaxPlayer = 8,
                Description = "Old event",
                Status = TicketEventStatus.Pending
            };
        }
    }
}
