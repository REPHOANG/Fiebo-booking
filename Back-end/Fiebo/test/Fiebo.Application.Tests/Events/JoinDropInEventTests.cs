using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
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
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ILogger<EventService>> _loggerMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<INotificationService> _notificationMock;
        private readonly Mock<IIdentityService> _identityMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;

        private readonly Mock<ITicketEventRepository> _eventRepoMock;
        private readonly Mock<ITicketParticipantRepository> _participantRepoMock;
        private readonly Mock<IOwnerPlanRepository> _ownerPlanRepoMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;

        private readonly EventService _eventService;

        public JoinDropInEventTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _loggerMock = new Mock<ILogger<EventService>>();
            _cacheServiceMock = new Mock<ICacheService>();
            _notificationMock = new Mock<INotificationService>();
            _identityMock = new Mock<IIdentityService>();
            _serviceProviderMock = new Mock<IServiceProvider>();

            _eventRepoMock = new Mock<ITicketEventRepository>();
            _participantRepoMock = new Mock<ITicketParticipantRepository>();
            _ownerPlanRepoMock = new Mock<IOwnerPlanRepository>();
            _venueRepoMock = new Mock<IVenueRepository>();

            _unitOfWorkMock.Setup(u => u.TicketEvents).Returns(_eventRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketParticipants).Returns(_participantRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.OwnerPlans).Returns(_ownerPlanRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);

            _eventService = new EventService(
                _unitOfWorkMock.Object,
                _loggerMock.Object,
                _cacheServiceMock.Object,
                _notificationMock.Object,
                _identityMock.Object,
                _serviceProviderMock.Object);
        }

        private JoinEventRequest CreateValidRequest()
        {
            return new JoinEventRequest
            {
                Fullname = "Tuan Do",
                PhoneNumber = "0988987427",
                TicketQuantity = 2
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_UserId_Is_Null()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, null));
            Assert.Equal("Bạn cần đăng nhập để thực hiện hành động này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_UserId_Is_Empty()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, ""));
            Assert.Equal("Bạn cần đăng nhập để thực hiện hành động này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_NotFoundException_When_Event_Not_Found()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(999)).ReturnsAsync((TicketEvent)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 999, "valid-id"));
            Assert.Equal("Sự kiện này không tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_Event_Not_Pending()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            var ticketEvent = new TicketEvent { Id = 1, Status = TicketEventStatus.Ongoing, VenueId = 10, Details = new List<TicketEventDetail>() };
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(1)).ReturnsAsync(ticketEvent);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id"));
            Assert.Equal("Sự kiện này hiện tại không có sẵn", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Venue_Deactivated()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Status = VenueStatus.Inactive, Name = "Sân test" };
            var ticketEvent = new TicketEvent { Id = 1, Status = TicketEventStatus.Pending, VenueId = 10, Venue = venue, Details = new List<TicketEventDetail>() };
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(1)).ReturnsAsync(ticketEvent);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>())).ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id"));
            Assert.Equal("Cơ sở này hiện không hoạt động.", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_Field_Deactivated()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Status = VenueStatus.Active, Name = "Sân test" };
            var field = new Field { Id = 5, Status = FieldStatus.Inactive, Name = "Sân 5" };
            var detail = new TicketEventDetail { FieldId = 5, Field = field, Slot = new TimeSlot { IsDeleted = false } };
            var ticketEvent = new TicketEvent { Id = 1, Status = TicketEventStatus.Pending, VenueId = 10, Venue = venue, Details = new List<TicketEventDetail> { detail } };
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(1)).ReturnsAsync(ticketEvent);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id"));
            Assert.Equal("Sân hiện tại không hoạt động.", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_ResourceConflictException_When_Concurrency_Lock_Fails()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync((string)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id"));
            Assert.Equal("Sự kiện đang được xử lý, vui lòng thử lại.", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Throw_BadRequestException_When_Tickets_Sold_Out()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Status = VenueStatus.Active, Name = "Sân test" };
            var ticketEvent = new TicketEvent { Id = 1, Status = TicketEventStatus.Pending, VenueId = 10, Venue = venue, MaxPlayer = 10, Details = new List<TicketEventDetail>() };
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(1)).ReturnsAsync(ticketEvent);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>())).ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _participantRepoMock.Setup(u => u.GetCurrentPlayer(1)).ReturnsAsync(9); // 9 + 2 > 10

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id"));
            Assert.Equal("Số lượng người tham gia sự kiện đã đầy", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Join_Successfully_When_Valid_Data()
        {
            // Arrange
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-val");
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Status = VenueStatus.Active, Name = "Sân test" };
            var ticketEvent = new TicketEvent { Id = 1, Status = TicketEventStatus.Pending, VenueId = 10, Venue = venue, MaxPlayer = 10, PricePerPerson = 50000, Details = new List<TicketEventDetail>() };
            _eventRepoMock.Setup(u => u.GetDropInEventDetailAsync(1)).ReturnsAsync(ticketEvent);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>())).ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _participantRepoMock.Setup(u => u.GetCurrentPlayer(1)).ReturnsAsync(5); // 5 + 2 <= 10

            // Act
            var result = await _eventService.JoinDropInEventAsync(CreateValidRequest(), 1, "valid-id");

            // Assert
            _participantRepoMock.Verify(u => u.Add(It.IsAny<TicketParticipant>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
            _cacheServiceMock.Verify(c => c.ReleaseLockAsync(It.IsAny<string>(), "lock-val"), Times.Once);
        }
    }
}
