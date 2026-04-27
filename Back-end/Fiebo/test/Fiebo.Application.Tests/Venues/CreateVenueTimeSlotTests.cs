using System;
using System.Collections.Generic;
using System.Linq;
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
    public class CreateVenueTimeSlotTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<ISportTypeRepository> _sportTypeRepoMock;
        private readonly Mock<ITimeSlotRepository> _timeSlotRepoMock;

        private readonly TimeSlotService _timeSlotService;

        public CreateVenueTimeSlotTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _venueRepoMock = new Mock<IVenueRepository>();
            _sportTypeRepoMock = new Mock<ISportTypeRepository>();
            _timeSlotRepoMock = new Mock<ITimeSlotRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.SportTypes).Returns(_sportTypeRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TimeSlots).Returns(_timeSlotRepoMock.Object);

            _timeSlotService = new TimeSlotService(_unitOfWorkMock.Object);
        }

        private CreateVenueTimeSlotRequest CreateValidRequest()
        {
            return new CreateVenueTimeSlotRequest
            {
                SportTypeId = 1,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                DayOfWeek = "Monday",
                Price = 200000
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_OwnerId_Is_Null()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest>(), null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_OwnerId_Is_Invalid()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest>(), null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ForbiddenException_When_Venue_Not_Belong_To_Owner()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "other-owner", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { CreateValidRequest() }, "valid-id"));
            Assert.Equal("Chủ sở hữu không khớp", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_NotFoundException_When_Venue_Not_Found()
        {
            // Arrange
            _venueRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Venue)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _timeSlotService.CreateVenueTimeSlotAsync(999, new List<CreateVenueTimeSlotRequest> { CreateValidRequest() }, "valid-id"));
            Assert.Equal("Sân không tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_SportType_Not_Found()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _sportTypeRepoMock.Setup(u => u.GetByIdAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync((SportType)null);

            var request = CreateValidRequest();
            request.SportTypeId = 999;

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Môn thể thao không hợp lệ", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_StartTime_After_EndTime()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(10, 0);
            request.EndTime = new TimeOnly(9, 0);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Giờ bắt đầu phải trước giờ kết thúc", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_08_Should_Throw_BadRequestException_When_Duration_Is_Invalid()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(9, 0);
            request.EndTime = new TimeOnly(9, 29); // 29m duration

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Thời lượng khung giờ phải chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_Time_Not_Multiple_Of_30m()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(9, 15);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Thời gian bắt đầu và kết thúc phải chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_Outside_Venue_Working_Time()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(8, 0), CloseTime = new TimeOnly(23, 0) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            var request = CreateValidRequest();
            request.StartTime = new TimeOnly(7, 0);
            request.EndTime = new TimeOnly(8, 0);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Khung giờ nằm ngoài giờ mở/đóng của sân", ex.Message);
        }

        [Fact]
        public async Task UTCID_11_Should_Throw_BadRequestException_When_Overlapping_Exists()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(6, 0), CloseTime = new TimeOnly(23, 0) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _sportTypeRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(new SportType { Id = 1, Name = "Bóng đá" });
            _timeSlotRepoMock.Setup(u => u.IsTimeSlotOverlapping(1, 1, It.IsAny<DayOfWeek>(), It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), It.IsAny<int?>())).ReturnsAsync(true);

            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Khung giờ bị trùng với khung giờ đã tồn tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_12_Should_Throw_BadRequestException_When_DayOfWeek_Invalid()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            var request = CreateValidRequest();
            request.DayOfWeek = "Sundey";

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id"));
            Assert.Equal("Ngày trong tuần không hợp lệ", ex.Message);
        }

        [Fact]
        public async Task UTCID_13_Should_Create_Successfully_When_Valid_Data()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test", OpenTime = new TimeOnly(6, 0), CloseTime = new TimeOnly(23, 0) };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _sportTypeRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(new SportType { Id = 1, Name = "Bóng đá" });
            _timeSlotRepoMock.Setup(u => u.IsTimeSlotOverlapping(1, 1, It.IsAny<DayOfWeek>(), It.IsAny<TimeOnly>(), It.IsAny<TimeOnly>(), It.IsAny<int?>())).ReturnsAsync(false);

            var request = CreateValidRequest();

            // Act
            var result = await _timeSlotService.CreateVenueTimeSlotAsync(1, new List<CreateVenueTimeSlotRequest> { request }, "valid-id");

            // Assert
            Assert.Single(result);
            _timeSlotRepoMock.Verify(u => u.Add(It.IsAny<TimeSlot>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }
    }
}
