using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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
    public class UpdateDropInEventTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ILogger<EventService>> _loggerMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<INotificationService> _notificationMock;
        private readonly Mock<IIdentityService> _identityMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;

        private readonly Mock<ITicketEventRepository> _eventRepoMock;
        private readonly Mock<ITicketEventDetailRepository> _eventDetailRepoMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<ITicketParticipantRepository> _participantRepoMock;

        private readonly EventService _eventService;

        public UpdateDropInEventTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _loggerMock = new Mock<ILogger<EventService>>();
            _cacheServiceMock = new Mock<ICacheService>();
            _notificationMock = new Mock<INotificationService>();
            _identityMock = new Mock<IIdentityService>();
            _serviceProviderMock = new Mock<IServiceProvider>();

            _eventRepoMock = new Mock<ITicketEventRepository>();
            _eventDetailRepoMock = new Mock<ITicketEventDetailRepository>();
            _venueRepoMock = new Mock<IVenueRepository>();
            _participantRepoMock = new Mock<ITicketParticipantRepository>();

            _unitOfWorkMock.Setup(u => u.TicketEvents).Returns(_eventRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketEventsDetails).Returns(_eventDetailRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketParticipants).Returns(_participantRepoMock.Object);

            _eventService = new EventService(
                _unitOfWorkMock.Object,
                _loggerMock.Object,
                _cacheServiceMock.Object,
                _notificationMock.Object,
                _identityMock.Object,
                _serviceProviderMock.Object);
        }

        private UpdateEventRequest CreateValidRequest()
        {
            return new UpdateEventRequest
            {
                Name = "Xé vé - kết nối mọi người",
                PricePerPerson = 50000,
                MinPlayer = 4,
                MaxPlayer = 10,
                Description = "Sân chơi dành cho mọi người"
            };
        }

        [Fact]
        public async Task UTCID_01_02_Should_Throw_UnauthorizedException_When_OwnerId_Is_Invalid()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _eventService.UpdateDropInEventAsync(1, CreateValidRequest(), null));
            Assert.Equal("Bạn cần đăng nhập để thực hiện hành động này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ForbiddenException_When_Owner_Mismatch()
        {
            // Arrange
            var ticketEvent = new TicketEvent { Id = 1, VenueId = 10, Status = TicketEventStatus.Pending };
            var venue = new Venue { Id = 10, OwnerId = "real-owner", Name = "Sân test" };
            
            _eventRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(ticketEvent);
            _eventDetailRepoMock.Setup(u => u.GetEarliestDetailAsync(1)).ReturnsAsync(new TicketEventDetail());
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _eventService.UpdateDropInEventAsync(1, CreateValidRequest(), "wrong-owner"));
            Assert.Equal("Chủ sở hữu không khớp", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_NotFoundException_When_Event_Not_Found()
        {
            // Arrange
            _eventRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((TicketEvent)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _eventService.UpdateDropInEventAsync(999, CreateValidRequest(), "owner-id"));
            Assert.Equal("Sự kiện không tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Event_Not_Pending()
        {
            // Arrange
            var ticketEvent = new TicketEvent { Id = 1, VenueId = 10, Status = TicketEventStatus.Ongoing };
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Name = "Sân test" };
            
            _eventRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(ticketEvent);
            _eventDetailRepoMock.Setup(u => u.GetEarliestDetailAsync(1)).ReturnsAsync(new TicketEventDetail());
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.UpdateDropInEventAsync(1, CreateValidRequest(), "owner-id"));
            Assert.Equal("Chỉ sự kiện với trạng thái đang chờ mới có thể sửa", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_Event_Has_Participants()
        {
            // Arrange
            var ticketEvent = new TicketEvent { Id = 1, VenueId = 10, Status = TicketEventStatus.Pending };
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Name = "Sân test" };
            
            _eventRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(ticketEvent);
            _eventDetailRepoMock.Setup(u => u.GetEarliestDetailAsync(1)).ReturnsAsync(new TicketEventDetail());
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _participantRepoMock.Setup(u => u.GetCurrentPlayer(1)).ReturnsAsync(1);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.UpdateDropInEventAsync(1, CreateValidRequest(), "owner-id"));
            Assert.Equal("Không thể chỉnh sửa sự kiện khi đã có người đăng kí", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_MaxPlayer_Less_Than_MinPlayer()
        {
            // Arrange
            var ticketEvent = new TicketEvent { Id = 1, VenueId = 10, Status = TicketEventStatus.Pending };
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Name = "Sân test" };
            
            _eventRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(ticketEvent);
            _eventDetailRepoMock.Setup(u => u.GetEarliestDetailAsync(1)).ReturnsAsync(new TicketEventDetail());
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _participantRepoMock.Setup(u => u.GetCurrentPlayer(1)).ReturnsAsync(0);

            var request = CreateValidRequest();
            request.MinPlayer = 5;
            request.MaxPlayer = 3;

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _eventService.UpdateDropInEventAsync(1, request, "owner-id"));
            Assert.Equal("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_09_10_Should_Update_Successfully_When_Valid_Data()
        {
            // Arrange
            var ticketEvent = new TicketEvent { Id = 1, VenueId = 10, Status = TicketEventStatus.Pending };
            var venue = new Venue { Id = 10, OwnerId = "owner-id", Name = "Sân test" };
            
            _eventRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(ticketEvent);
            _eventDetailRepoMock.Setup(u => u.GetEarliestDetailAsync(1)).ReturnsAsync(new TicketEventDetail());
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _participantRepoMock.Setup(u => u.GetCurrentPlayer(1)).ReturnsAsync(0);

            var request = CreateValidRequest();

            // Act
            await _eventService.UpdateDropInEventAsync(1, request, "owner-id");

            // Assert
            Assert.Equal(request.Name, ticketEvent.Name);
            Assert.Equal(request.PricePerPerson, ticketEvent.PricePerPerson);
            Assert.Equal(request.MinPlayer, ticketEvent.MinPlayer);
            Assert.Equal(request.MaxPlayer, ticketEvent.MaxPlayer);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }
    }
}
