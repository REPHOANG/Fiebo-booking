using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Events
{
    public class GetDropInEventListTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<ITicketEventRepository> _ticketEventRepo = new();
        private readonly Mock<ILogger<EventService>> _logger = new();

        private readonly EventService _service;

        public GetDropInEventListTests()
        {
            _unitOfWork.Setup(x => x.TicketEvents).Returns(_ticketEventRepo.Object);
            _service = new EventService(_unitOfWork.Object, _logger.Object, null!);
        }

        private static TicketEvent CreatePendingEvent(
            int id = 1,
            int maxPlayer = 10,
            decimal pricePerPerson = 50_000m,
            int daysFromNow = 3,
            int participantTickets = 0)
        {
            var evt = new TicketEvent
            {
                Id = id,
                OwnerId = "owner1",
                EventDate = DateOnly.FromDateTime(DateTime.Now.AddDays(daysFromNow)),
                MinPlayer = 4,
                MaxPlayer = maxPlayer,
                PricePerPerson = pricePerPerson,
                Status = TicketEventStatus.Pending,
                Description = "Sân bóng đá 5 người",
                Details = new List<TicketEventDetail>
                {
                    new()
                    {
                        Id = 1,
                        EventId = id,
                        FieldId = 1,
                        SlotId = 1,
                        Field = new Field
                        {
                            Id = 1,
                            Name = "Sân 1",
                            SportTypeId = 1,
                            VenueId = 10,
                            Venue = new Venue
                            {
                                Id = 10,
                                Name = "Sân Bóng XYZ",
                                OwnerId = "owner1"
                            }
                        },
                        Slot = new TimeSlot
                        {
                            Id = 1,
                            StartTime = new TimeOnly(18, 0),
                            EndTime = new TimeOnly(19, 0)
                        }
                    }
                },
                Participants = new List<TicketParticipant>()
            };

            if (participantTickets > 0)
            {
                evt.Participants.Add(new TicketParticipant
                {
                    Id = 1,
                    EventId = id,
                    UserId = "user1",
                    Fullname = "Nguyen Van A",
                    PhoneNumber = "0901111111",
                    TicketQuantity = participantTickets,
                    Status = TicketParticipantStatus.Joined
                });
            }

            return evt;
        }

        [Fact]
        public async Task Should_ReturnEmptyList_WhenNoPendingEvents()
        {
            _ticketEventRepo
                .Setup(x => x.GetPendingEventsAsync())
                .ReturnsAsync(new List<TicketEvent>());

            var result = await _service.GetDropInEventListAsync();

            Assert.NotNull(result);
            Assert.Empty(result);
        }

        [Fact]
        public async Task Should_ReturnEventList_WithCorrectFields()
        {
            var evt = CreatePendingEvent(id: 1, maxPlayer: 10, pricePerPerson: 50_000m);

            _ticketEventRepo
                .Setup(x => x.GetPendingEventsAsync())
                .ReturnsAsync(new List<TicketEvent> { evt });

            var result = await _service.GetDropInEventListAsync();

            Assert.Single(result);
            var item = result.First();
            Assert.Equal(1, item.EventId);
            Assert.Equal("Sân Bóng XYZ", item.VenueName);
            Assert.Equal(evt.EventDate, item.EventDate);
            Assert.Equal(50_000m, item.TicketPrice);
            Assert.Equal(10, item.RemainingTicketQuantity);
            Assert.Single(item.Slots);
            Assert.Equal("Sân 1", item.Slots[0].FieldName);
            Assert.Equal(new TimeOnly(18, 0), item.Slots[0].StartTime);
            Assert.Equal(new TimeOnly(19, 0), item.Slots[0].EndTime);
        }

        [Fact]
        public async Task Should_CalculateRemainingTickets_BasedOnParticipants()
        {
            var evt = CreatePendingEvent(id: 1, maxPlayer: 10, participantTickets: 3);

            _ticketEventRepo
                .Setup(x => x.GetPendingEventsAsync())
                .ReturnsAsync(new List<TicketEvent> { evt });

            var result = await _service.GetDropInEventListAsync();

            Assert.Single(result);
            Assert.Equal(7, result.First().RemainingTicketQuantity);
        }

        [Fact]
        public async Task Should_ReturnMultipleEvents_OrderedByDate()
        {
            var evt1 = CreatePendingEvent(id: 1, daysFromNow: 5);
            var evt2 = CreatePendingEvent(id: 2, daysFromNow: 2);

            _ticketEventRepo
                .Setup(x => x.GetPendingEventsAsync())
                .ReturnsAsync(new List<TicketEvent> { evt2, evt1 });

            var result = await _service.GetDropInEventListAsync();

            Assert.Equal(2, result.Count);
            Assert.Equal(2, result[0].EventId);
            Assert.Equal(1, result[1].EventId);
        }

        [Fact]
        public async Task Should_ReturnSlotsOrderedByStartTime()
        {
            var evt = CreatePendingEvent();
            evt.Details.Add(new TicketEventDetail
            {
                Id = 2,
                EventId = 1,
                FieldId = 2,
                SlotId = 2,
                Field = new Field
                {
                    Id = 2,
                    Name = "Sân 2",
                    SportTypeId = 1,
                    VenueId = 10,
                    Venue = new Venue { Id = 10, Name = "Sân Bóng XYZ", OwnerId = "owner1" }
                },
                Slot = new TimeSlot
                {
                    Id = 2,
                    StartTime = new TimeOnly(17, 0),
                    EndTime = new TimeOnly(18, 0)
                }
            });

            _ticketEventRepo
                .Setup(x => x.GetPendingEventsAsync())
                .ReturnsAsync(new List<TicketEvent> { evt });

            var result = await _service.GetDropInEventListAsync();

            Assert.Equal(2, result.First().Slots.Count);
            Assert.Equal(new TimeOnly(17, 0), result.First().Slots[0].StartTime);
            Assert.Equal(new TimeOnly(18, 0), result.First().Slots[1].StartTime);
        }
    }
}
