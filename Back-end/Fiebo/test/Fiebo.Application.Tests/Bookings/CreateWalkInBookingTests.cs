using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Bookings
{
    public class CreateWalkInBookingTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IOtpService> _otpServiceMock;
        private readonly Mock<ISmsService> _smsServiceMock;
        private readonly Mock<ILogger<BookingService>> _loggerMock;
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ITokenService> _tokenServiceMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<INotificationService> _notificationServiceMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<IFieldRepository> _fieldRepoMock;
        private readonly Mock<ITimeSlotRepository> _timeSlotRepoMock;
        private readonly Mock<IBookingRepository> _bookingRepoMock;
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepoMock;
        private readonly Mock<ITicketEventRepository> _ticketEventRepoMock;
        private readonly Mock<IVenueStaffRepository> _venueStaffRepoMock;
        private readonly BookingService _bookingService;

        public CreateWalkInBookingTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _otpServiceMock = new Mock<IOtpService>();
            _smsServiceMock = new Mock<ISmsService>();
            _loggerMock = new Mock<ILogger<BookingService>>();
            _identityServiceMock = new Mock<IIdentityService>();
            _tokenServiceMock = new Mock<ITokenService>();
            _cacheServiceMock = new Mock<ICacheService>();
            _notificationServiceMock = new Mock<INotificationService>();

            _venueRepoMock = new Mock<IVenueRepository>();
            _fieldRepoMock = new Mock<IFieldRepository>();
            _timeSlotRepoMock = new Mock<ITimeSlotRepository>();
            _bookingRepoMock = new Mock<IBookingRepository>();
            _bookingDetailRepoMock = new Mock<IBookingDetailRepository>();
            _ticketEventRepoMock = new Mock<ITicketEventRepository>();
            _venueStaffRepoMock = new Mock<IVenueStaffRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Fields).Returns(_fieldRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TimeSlots).Returns(_timeSlotRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Bookings).Returns(_bookingRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.BookingDetails).Returns(_bookingDetailRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketEvents).Returns(_ticketEventRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.VenueStaffs).Returns(_venueStaffRepoMock.Object);

            // Default behavior to avoid NullReferenceException on ToDictionary
            _fieldRepoMock.Setup(r => r.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field>());
            _timeSlotRepoMock.Setup(r => r.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot>());
            _bookingDetailRepoMock.Setup(r => r.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)>());
            _ticketEventRepoMock.Setup(r => r.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)>());

            _bookingService = new BookingService(
                _unitOfWorkMock.Object,
                _otpServiceMock.Object,
                _smsServiceMock.Object,
                _loggerMock.Object,
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _cacheServiceMock.Object,
                _notificationServiceMock.Object
            );
        }

        private CreateBookingRequest CreateValidRequest()
        {
            return new CreateBookingRequest
            {
                VenueId = 1,
                BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                Fullname = "Tuan Do",
                PhoneNumber = "0988988786",
                BookingNote = "Cẩn đảm bảo sân không trơn trượt",
                Details = new List<CreateBookingDetailRequest>
                {
                    new CreateBookingDetailRequest { FieldId = 1, SlotId = 1 }
                }
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_UserId_IsNull()
        {
            // Arrange
            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _bookingService.CreateWalkInBookingAsync(request, null, AppRoles.FieldOwner));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_UserId_IsInvalid()
        {
            // Arrange
            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _bookingService.CreateWalkInBookingAsync(request, null, AppRoles.FieldOwner));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_BadRequestException_When_Venue_NotFound()
        {
            // Arrange
            var request = CreateValidRequest();
            request.VenueId = 999;
            _venueRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Venue)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "valid-id", AppRoles.FieldOwner));
            Assert.Equal("Cơ sở này hiện không hoạt động.", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_ForbiddenException_When_Venue_Not_Belong_To_Owner()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "other-owner", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Bạn không có quyền để thực hiện hành động này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Field_NotFound_Or_Inactive()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details[0].FieldId = 999;
            
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>()))
                .ReturnsAsync(new List<Field>()); 

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Sân không tồn tại hoặc đã bị vô hiệu hóa.", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_Slot_NotFound()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details[0].SlotId = 999;

            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot>());

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Slot không tồn tại hoặc đã bị xóa.", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_Slot_Already_Started()
        {
            // Arrange
            var now = DateTime.Now;
            var pastTime = TimeOnly.FromDateTime(now.AddHours(-1));
            var request = CreateValidRequest();
            request.BookingDate = DateOnly.FromDateTime(now); 

            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 1, VenueId = 1, StartTime = pastTime };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Slot đã bắt đầu hoặc đã kết thúc.", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Throw_BadRequestException_When_Field_Not_Belong_To_Venue()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 99, Status = FieldStatus.Active }; 
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Sân không thuộc cơ sở này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_Slot_Not_Belong_To_Venue()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 1, VenueId = 99, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(1)) }; 
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Slot không thuộc cơ sở này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_BookingDate_Is_In_Past()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BookingDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-1));
            
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "valid-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(request.VenueId)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateWalkInBookingAsync(request, "valid-id", AppRoles.FieldOwner));
            Assert.Equal("Ngày đặt không hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_11_Should_Throw_ResourceConflictException_When_Lock_Acquisition_Fails()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync((string)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Slot hiện tại đã bị khóa. Vui lòng chọn slot khác.", ex.Message);
        }

        [Fact]
        public async Task UTCID_12_Should_Throw_ResourceConflictException_When_Slot_Is_Already_Booked()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 1, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)) };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            _bookingDetailRepoMock.Setup(u => u.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (1, 1) });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Một số slot đã được đặt.", ex.Message);
        }

        [Fact]
        public async Task UTCID_13_Should_Throw_ResourceConflictException_When_Slot_Is_Used_By_Event()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 1, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)) };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            _bookingDetailRepoMock.Setup(u => u.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)>());

            _ticketEventRepoMock.Setup(u => u.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (1, 1) });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner));
            Assert.Equal("Một số slot đã được sử dụng cho sự kiện.", ex.Message);
        }

        [Fact]
        public async Task UTCID_14_Should_Create_Booking_Successfully_When_Valid_Data()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 1, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)) };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            _bookingDetailRepoMock.Setup(u => u.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)>());
            _ticketEventRepoMock.Setup(u => u.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)>());

            // Act
            var result = await _bookingService.CreateWalkInBookingAsync(request, "owner-id", AppRoles.FieldOwner);

            // Assert
            Assert.True(result);
            _bookingRepoMock.Verify(u => u.Add(It.IsAny<Booking>()), Times.Once);
        }
    }
}

