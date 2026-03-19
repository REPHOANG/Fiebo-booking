using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Event;
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
    public class CreateDropInEventTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IFieldRepository> _fieldRepo = new();
        private readonly Mock<IVenueRepository> _venueRepo = new();
        private readonly Mock<ITimeSlotRepository> _timeSlotRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepo = new();
        private readonly Mock<ITicketEventRepository> _ticketEventRepo = new();
        private readonly Mock<ILogger<EventService>> _logger = new();

        private readonly EventService _service;

        private const string OwnerId = "owner1";

        public CreateDropInEventTests()
        {
            _unitOfWork.Setup(x => x.Fields).Returns(_fieldRepo.Object);
            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
            _unitOfWork.Setup(x => x.TimeSlots).Returns(_timeSlotRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingDetailRepo.Object);
            _unitOfWork.Setup(x => x.TicketEvents).Returns(_ticketEventRepo.Object);
            _unitOfWork.Setup(x => x.SaveChangesAsync()).ReturnsAsync(1);

            _service = new EventService(_unitOfWork.Object, _logger.Object, null!);
        }

        private static CreateDropInEventRequest CreateValidRequest(int daysFromNow = 3)
        {
            return new CreateDropInEventRequest
            {
                EventDate = DateOnly.FromDateTime(DateTime.Now.AddDays(daysFromNow)),
                PricePerPerson = 50_000m,
                MinPlayer = 4,
                MaxPlayer = 10,
                Description = "Bóng đá 5 người",
                Details =
                [
                    new() { FieldId = 1, SlotId = 1 }
                ]
            };
        }

        private void SetupFieldAndVenue(int fieldId = 1, int venueId = 10, string venueOwnerId = OwnerId)
        {
            _fieldRepo
                .Setup(x => x.GetByIdAsync(fieldId))
                .ReturnsAsync(new Field
                {
                    Id = fieldId,
                    Name = "Sân 1",
                    SportTypeId = 1,
                    VenueId = venueId
                });

            _venueRepo
                .Setup(x => x.GetByIdAsync(venueId))
                .ReturnsAsync(new Venue
                {
                    Id = venueId,
                    Name = "Sân Bóng ABC",
                    OwnerId = venueOwnerId
                });
        }

        private void SetupSlotExists(int slotId = 1)
        {
            _timeSlotRepo
                .Setup(x => x.GetByIdAsync(slotId))
                .ReturnsAsync(new TimeSlot
                {
                    Id = slotId,
                    StartTime = new TimeOnly(18, 0),
                    EndTime = new TimeOnly(19, 0)
                });
        }

        private void SetupSlotsAvailable()
        {
            _bookingDetailRepo
                .Setup(x => x.IsSlotAvailable(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(true);

            _ticketEventRepo
                .Setup(x => x.IsSlotUsedByEventAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(false);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenDetailsEmpty()
        {
            var request = CreateValidRequest();
            request.Details = [];

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));

            Assert.Equal("Phải chọn ít nhất một sân và khung giờ.", ex.Message);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenMinPlayerIsZero()
        {
            var request = CreateValidRequest();
            request.MinPlayer = 0;

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));

            Assert.Equal("Số người tối thiểu phải lớn hơn 0.", ex.Message);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenMaxPlayerLessThanMinPlayer()
        {
            var request = CreateValidRequest();
            request.MinPlayer = 10;
            request.MaxPlayer = 5;

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));

            Assert.Equal("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu.", ex.Message);
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenFieldDoesNotExist()
        {
            var request = CreateValidRequest();

            _fieldRepo
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((Field?)null);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserDoesNotOwnVenue()
        {
            var request = CreateValidRequest();

            SetupFieldAndVenue(venueOwnerId: "other-owner");

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenSlotDoesNotExist()
        {
            var request = CreateValidRequest();

            SetupFieldAndVenue();
            _timeSlotRepo
                .Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((TimeSlot?)null);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenSlotAlreadyBookedByBooking()
        {
            var request = CreateValidRequest();

            SetupFieldAndVenue();
            SetupSlotExists();

            _bookingDetailRepo
                .Setup(x => x.IsSlotAvailable(1, 1, request.EventDate))
                .ReturnsAsync(false);

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));
        }

        [Fact]
        public async Task Should_ThrowConflict_WhenSlotAlreadyUsedByEvent()
        {
            var request = CreateValidRequest();

            SetupFieldAndVenue();
            SetupSlotExists();

            _bookingDetailRepo
                .Setup(x => x.IsSlotAvailable(1, 1, request.EventDate))
                .ReturnsAsync(true);

            _ticketEventRepo
                .Setup(x => x.IsSlotUsedByEventAsync(1, 1, request.EventDate))
                .ReturnsAsync(true);

            await Assert.ThrowsAsync<ResourceConflictException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));
        }

        [Fact]
        public async Task Should_CreateEvent_AndReturnId_WhenValid()
        {
            var request = CreateValidRequest();

            SetupFieldAndVenue();
            SetupSlotExists();
            SetupSlotsAvailable();

            var result = await _service.CreateDropInEventAsync(request, OwnerId);

            _ticketEventRepo.Verify(x => x.Add(It.Is<TicketEvent>(e =>
                e.OwnerId == OwnerId &&
                e.EventDate == request.EventDate &&
                e.PricePerPerson == 50_000m &&
                e.MinPlayer == 4 &&
                e.MaxPlayer == 10 &&
                e.Status == TicketEventStatus.Pending &&
                e.Details.Count == 1
            )), Times.Once);

            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Should_CreateEvent_WithMultipleDetails()
        {
            var request = CreateValidRequest();
            request.Details =
            [
                new() { FieldId = 1, SlotId = 1 },
                new() { FieldId = 1, SlotId = 2 }
            ];

            SetupFieldAndVenue(fieldId: 1);
            _timeSlotRepo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(new TimeSlot { Id = 1 });
            _timeSlotRepo.Setup(x => x.GetByIdAsync(2)).ReturnsAsync(new TimeSlot { Id = 2 });
            SetupSlotsAvailable();

            var result = await _service.CreateDropInEventAsync(request, OwnerId);

            _ticketEventRepo.Verify(x => x.Add(It.Is<TicketEvent>(e =>
                e.Details.Count == 2
            )), Times.Once);
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenFieldsBelongToDifferentVenues()
        {
            var request = CreateValidRequest();
            request.Details =
            [
                new() { FieldId = 1, SlotId = 1 },
                new() { FieldId = 2, SlotId = 2 }
            ];

            _fieldRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(new Field { Id = 1, Name = "Sân 1", SportTypeId = 1, VenueId = 10 });
            _fieldRepo.Setup(x => x.GetByIdAsync(2))
                .ReturnsAsync(new Field { Id = 2, Name = "Sân 2", SportTypeId = 1, VenueId = 20 });

            _venueRepo.Setup(x => x.GetByIdAsync(10))
                .ReturnsAsync(new Venue { Id = 10, Name = "Venue A", OwnerId = OwnerId });
            _venueRepo.Setup(x => x.GetByIdAsync(20))
                .ReturnsAsync(new Venue { Id = 20, Name = "Venue B", OwnerId = OwnerId });

            _timeSlotRepo.Setup(x => x.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(new TimeSlot { Id = 1 });

            var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateDropInEventAsync(request, OwnerId));

            Assert.Equal("Tất cả sân phải thuộc cùng một cơ sở.", ex.Message);
        }
    }
}
