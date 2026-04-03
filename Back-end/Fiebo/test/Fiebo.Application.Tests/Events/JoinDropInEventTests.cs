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
    public class JoinDropInEventTests
    {
        private readonly IFixture _fixture;

        public JoinDropInEventTests()
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
            Mock<ITicketParticipantRepository> participantRepoMock,
            Mock<ICacheService> cacheMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var loggerMock = _fixture.Freeze<Mock<ILogger<EventService>>>();

            uowMock.Setup(x => x.TicketEvents).Returns(ticketEventRepoMock.Object);
            uowMock.Setup(x => x.TicketParticipants).Returns(participantRepoMock.Object);

            _fixture.Inject(cacheMock.Object);
            _fixture.Inject(loggerMock.Object);
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenCannotAcquireLock()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock
                .Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>()))
                .ReturnsAsync((string?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<ResourceConflictException>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            ticketEventRepoMock.Verify(x => x.GetDropInEventDetailAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenEventNotFound_AndReleaseLock()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock
                .Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>()))
                .ReturnsAsync("lock-value");

            ticketEventRepoMock
                .Setup(x => x.GetDropInEventDetailAsync(1))
                .ReturnsAsync((TicketEvent?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync("event:lock:1", "lock-value"), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenFieldInactive()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Pending, FieldStatus.Inactive, VenueStatus.Active));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync("event:lock:1", "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenVenueInactive()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Pending, FieldStatus.Active, VenueStatus.Inactive));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenEventNotPending()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Completed, FieldStatus.Active, VenueStatus.Active));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenCapacityExceeded()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Pending, FieldStatus.Active, VenueStatus.Active, maxPlayer: 10));
            participantRepoMock.Setup(x => x.GetCurrentPlayer(1)).ReturnsAsync(9);

            var request = ValidRequest();
            request.TicketQuantity = 2;

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.JoinDropInEventAsync(request, 1, "user-1"));
        }

        [Fact]
        public async Task Should_JoinEvent_WhenValid()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Pending, FieldStatus.Active, VenueStatus.Active, maxPlayer: 10, pricePerPerson: 60000m));
            participantRepoMock.Setup(x => x.GetCurrentPlayer(1)).ReturnsAsync(4);

            TicketParticipant? added = null;
            participantRepoMock
                .Setup(x => x.Add(It.IsAny<TicketParticipant>()))
                .Callback<TicketParticipant>(p =>
                {
                    p.Id = 99;
                    added = p;
                });

            var request = ValidRequest();
            request.TicketQuantity = 2;

            var service = CreateService();
            var result = await service.JoinDropInEventAsync(request, 1, "user-1");

            Assert.Equal(99, result);
            Assert.NotNull(added);
            Assert.Equal(1, added.EventId);
            Assert.Equal("user-1", added.UserId);
            Assert.Equal(request.Fullname, added.Fullname);
            Assert.Equal(request.PhoneNumber, added.PhoneNumber);
            Assert.Equal(2, added.TicketQuantity);
            Assert.Equal(60000m, added.PricePerTicket);
            Assert.Equal(120000m, added.TotalPrice);
            Assert.Equal(TicketParticipantStatus.Pending, added.Status);
            Assert.True(added.ExpiredAt.HasValue);

            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            cacheMock.Verify(x => x.ReleaseLockAsync("event:lock:1", "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_ReleaseLock_WhenSaveChangesThrows()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");
            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(EventWithStatus(TicketEventStatus.Pending, FieldStatus.Active, VenueStatus.Active));
            participantRepoMock.Setup(x => x.GetCurrentPlayer(1)).ReturnsAsync(0);
            uowMock.Setup(x => x.SaveChangesAsync()).ThrowsAsync(new Exception("db error"));

            var service = CreateService();

            await Assert.ThrowsAsync<Exception>(async () =>
                await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1"));

            cacheMock.Verify(x => x.ReleaseLockAsync("event:lock:1", "lock"), Times.Once);
        }

        [Fact]
        public async Task Should_JoinEvent_WhenNoDetailsExist()
        {
            var ticketEventRepoMock = _fixture.Freeze<Mock<ITicketEventRepository>>();
            var participantRepoMock = _fixture.Freeze<Mock<ITicketParticipantRepository>>();
            var cacheMock = _fixture.Freeze<Mock<ICacheService>>();
            SetupRepositories(ticketEventRepoMock, participantRepoMock, cacheMock);

            cacheMock.Setup(x => x.AcquireLockAsync("event:lock:1", It.IsAny<TimeSpan>())).ReturnsAsync("lock");

            ticketEventRepoMock.Setup(x => x.GetDropInEventDetailAsync(1)).ReturnsAsync(new TicketEvent
            {
                Id = 1,
                OwnerId = "owner-1",
                EventDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                MinPlayer = 2,
                MaxPlayer = 10,
                PricePerPerson = 50000m,
                Status = TicketEventStatus.Pending,
                Details = new List<TicketEventDetail>()
            });

            participantRepoMock.Setup(x => x.GetCurrentPlayer(1)).ReturnsAsync(0);

            var service = CreateService();

            var result = await service.JoinDropInEventAsync(ValidRequest(), 1, "user-1");

            Assert.True(result >= 0);
        }

        private static JoinEventRequest ValidRequest()
        {
            return new JoinEventRequest
            {
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                TicketQuantity = 1
            };
        }

        private static TicketEvent EventWithStatus(
            TicketEventStatus eventStatus,
            FieldStatus fieldStatus,
            VenueStatus venueStatus,
            int maxPlayer = 20,
            decimal pricePerPerson = 50000m)
        {
            return new TicketEvent
            {
                Id = 1,
                OwnerId = "owner-1",
                EventDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                MinPlayer = 2,
                MaxPlayer = maxPlayer,
                PricePerPerson = pricePerPerson,
                Status = eventStatus,
                Details = new List<TicketEventDetail>
                {
                    new()
                    {
                        Id = 1,
                        FieldId = 1,
                        SlotId = 1,
                        Field = new Field
                        {
                            Id = 1,
                            Name = "Field A",
                            VenueId = 10,
                            SportTypeId = 1,
                            Status = fieldStatus,
                            Venue = new Venue
                            {
                                Id = 10,
                                Name = "Venue A",
                                OwnerId = "owner-1",
                                Status = venueStatus
                            }
                        },
                        Slot = new TimeSlot
                        {
                            Id = 1,
                            StartTime = new TimeOnly(10, 0),
                            EndTime = new TimeOnly(11, 0)
                        }
                    }
                }
            };
        }
    }
}
