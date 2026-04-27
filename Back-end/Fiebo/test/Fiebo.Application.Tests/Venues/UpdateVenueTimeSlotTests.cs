using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class UpdateVenueTimeSlotTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<ITimeSlotRepository> _timeSlotRepoMock;
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepoMock;
        private readonly Mock<ITicketEventDetailRepository> _ticketEventDetailRepoMock;

        private readonly TimeSlotService _timeSlotService;

        public UpdateVenueTimeSlotTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _venueRepoMock = new Mock<IVenueRepository>();
            _timeSlotRepoMock = new Mock<ITimeSlotRepository>();
            _bookingDetailRepoMock = new Mock<IBookingDetailRepository>();
            _ticketEventDetailRepoMock = new Mock<ITicketEventDetailRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TimeSlots).Returns(_timeSlotRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.BookingDetails).Returns(_bookingDetailRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketEventsDetails).Returns(_ticketEventDetailRepoMock.Object);

            _timeSlotService = new TimeSlotService(_unitOfWorkMock.Object);
        }

        private UpdateVenueTimeSlotRequest CreateValidRequest()
        {
            return new UpdateVenueTimeSlotRequest
            {
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Price = 200000
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_OwnerId_Is_Null()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_OwnerId_Is_Invalid()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ForbiddenException_When_Slot_Not_Belong_To_Owner()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10 };
            var venue = new Venue { Id = 10, OwnerId = "other-owner", Name = "Sân test" };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), "valid-id"));
            Assert.Equal("Chủ sở hữu không khớp", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_Slot_Not_Found()
        {
            // Arrange
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((TimeSlot)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(999, CreateValidRequest(), "valid-id"));
            Assert.Equal("Slot không tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Slot_Is_Deleted()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10, IsDeleted = true };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), "valid-id"));
            Assert.Equal("Slot này đã bị xoá", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_StartTime_After_EndTime()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10 };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(10, 0);
            request.EndTime = new TimeOnly(9, 0);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, request, "valid-id"));
            Assert.Equal("Giờ bắt đầu phải trước giờ kết thúc", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_08_Should_Throw_BadRequestException_When_Duration_Is_Invalid()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10 };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(9, 0);
            request.EndTime = new TimeOnly(9, 29);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, request, "valid-id"));
            Assert.Equal("Thời lượng khung giờ phải chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_Time_Not_Multiple_Of_30m()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10 };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(9, 15);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, request, "valid-id"));
            Assert.Equal("Thời gian bắt đầu và kết thúc phải chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_Overlapping_Exists()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10, SportTypeId = 1, DayOfWeek = DayOfWeek.Monday };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);
            _timeSlotRepoMock.Setup(u => u.IsTimeSlotOverlapping(10, 1, DayOfWeek.Monday, It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), 1)).ReturnsAsync(true);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), "valid-id"));
            Assert.Equal("Khung giờ bị trùng với khung giờ đã tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_11_Should_Throw_BadRequestException_When_Outside_Venue_Working_Time()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10 };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(8, 0), CloseTime = new TimeOnly(23, 0) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(7, 0);
            request.EndTime = new TimeOnly(8, 0);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.UpdateVenueTimeSlotAsync(1, request, "valid-id"));
            Assert.Equal("Khung giờ nằm ngoài giờ mở/đóng của sân", ex.Message);
        }

        [Fact]
        public async Task UTCID_12_Should_Update_Successfully_When_Valid_Data()
        {
            // Arrange
            var timeSlot = new TimeSlot { Id = 1, VenueId = 10, SportTypeId = 1, DayOfWeek = DayOfWeek.Monday, StartTime = new TimeOnly(8,0), EndTime = new TimeOnly(9,0) };
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _timeSlotRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(timeSlot);
            _venueRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(venue);
            _timeSlotRepoMock.Setup(u => u.CanBeEditedOrDeleted(1)).ReturnsAsync(true);
            _timeSlotRepoMock.Setup(u => u.IsTimeSlotOverlapping(10, 1, DayOfWeek.Monday, It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), 1)).ReturnsAsync(false);
            _bookingDetailRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<BookingDetail, bool>>>())).ReturnsAsync(new List<BookingDetail>());

            // Act
            var result = await _timeSlotService.UpdateVenueTimeSlotAsync(1, CreateValidRequest(), "valid-id");

            // Assert
            Assert.Equal(1, result.Id);
            _timeSlotRepoMock.Verify(u => u.Update(It.IsAny<TimeSlot>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }
    }
}
