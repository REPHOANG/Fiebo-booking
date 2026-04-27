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
    public class CreateBookingTests
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
        private readonly Mock<IOwnerPlanRepository> _ownerPlanRepoMock;
        private readonly Mock<IVenueServiceItemRepository> _venueServiceRepoMock;
        private readonly Mock<IBookingServiceItemRepository> _bookingServiceItemRepoMock;

        private readonly BookingService _bookingService;

        public CreateBookingTests()
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
            _ownerPlanRepoMock = new Mock<IOwnerPlanRepository>();
            _venueServiceRepoMock = new Mock<IVenueServiceItemRepository>();
            _bookingServiceItemRepoMock = new Mock<IBookingServiceItemRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Fields).Returns(_fieldRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TimeSlots).Returns(_timeSlotRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Bookings).Returns(_bookingRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.BookingDetails).Returns(_bookingDetailRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.TicketEvents).Returns(_ticketEventRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.OwnerPlans).Returns(_ownerPlanRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.VenueServiceItems).Returns(_venueServiceRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.BookingServiceItems).Returns(_bookingServiceItemRepoMock.Object);

            // Default behaviors
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
                Fullname = "Trung Hieu",
                PhoneNumber = "0988988786",
                BookingNote = "Ghi chú đặt sân",
                Details = new List<CreateBookingDetailRequest>
                {
                    new CreateBookingDetailRequest { FieldId = 1, SlotId = 10 }
                }
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_BadRequestException_When_Venue_NotFound_Or_Inactive()
        {
            // Arrange
            var request = CreateValidRequest();
            request.VenueId = 999;
            _venueRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Venue)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Cơ sở này hiện không hoạt động.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_BadRequestException_When_Field_NotFound_Or_Inactive()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details[0].FieldId = 999;
            
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field>());

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Sân này hiện không hoạt động.", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ResourceConflictException_When_Lock_Acquisition_Fails()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync((string)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Slot hiện tại đã bị khóa. Vui lòng chọn slot khác.", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_ResourceConflictException_When_Slot_Is_Already_Booked()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details[0].SlotId = 999;

            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 999, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)) };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            _bookingDetailRepoMock.Setup(u => u.GetUnavailableSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (999, 1) });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Sân hiện tại hiện không có slot trống.", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_ResourceConflictException_When_Slot_Is_Used_By_Event()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 10, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)) };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            _ticketEventRepoMock.Setup(u => u.GetUsedSlots(It.IsAny<List<int>>(), It.IsAny<List<int>>(), It.IsAny<DateOnly>()))
                .ReturnsAsync(new List<(int SlotId, int FieldId)> { (10, 1) });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Sân hiện tại hiện không có slot trống.", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_Details_Empty()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details = new List<CreateBookingDetailRequest>();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Vui lòng chọn ít nhất một khung giờ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_Details_Duplicate()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details.Add(new CreateBookingDetailRequest { FieldId = 1, SlotId = 10 });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateBookingAsync(request, "valid-id"));
            Assert.Equal("Danh sách đặt sân bị trùng lặp khung giờ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Create_Booking_Successfully_With_Single_Slot()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field = new Field { Id = 1, Name = "Test Field", VenueId = 1, Status = FieldStatus.Active };
            var slot = new TimeSlot { Id = 10, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)), Price = 50000 };
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot });

            // Act
            var result = await _bookingService.CreateBookingAsync(request, "valid-id");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(50000, result.TotalPrice);
            _bookingRepoMock.Verify(u => u.Add(It.IsAny<Booking>()), Times.Once);
        }

        [Fact]
        public async Task UTCID_09_Should_Create_Booking_Successfully_With_Multiple_Slots()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Details.Add(new CreateBookingDetailRequest { FieldId = 2, SlotId = 20 });
            
            var venue = new Venue { Id = 1, Name = "Test Venue", OwnerId = "owner-id", Status = VenueStatus.Active };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _ownerPlanRepoMock.Setup(u => u.FindAsync(It.IsAny<Expression<Func<OwnerPlan, bool>>>()))
                .ReturnsAsync(new List<OwnerPlan> { new OwnerPlan { OwnerId = "owner-id", Status = OwnerPlanStatus.Active, EndDate = DateTime.Now.AddDays(1) } });
            _cacheServiceMock.Setup(c => c.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>())).ReturnsAsync("lock-value");
            
            var field1 = new Field { Id = 1, Name = "Field 1", VenueId = 1, Status = FieldStatus.Active };
            var field2 = new Field { Id = 2, Name = "Field 2", VenueId = 1, Status = FieldStatus.Active };
            var slot1 = new TimeSlot { Id = 10, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(5)), Price = 50000 };
            var slot2 = new TimeSlot { Id = 20, VenueId = 1, StartTime = TimeOnly.FromDateTime(DateTime.Now.AddHours(6)), Price = 60000 };
            
            _fieldRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<Field> { field1, field2 });
            _timeSlotRepoMock.Setup(u => u.GetByIdsAsync(It.IsAny<List<int>>())).ReturnsAsync(new List<TimeSlot> { slot1, slot2 });

            // Act
            var result = await _bookingService.CreateBookingAsync(request, "valid-id");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(110000, result.TotalPrice);
            _bookingRepoMock.Verify(u => u.Add(It.IsAny<Booking>()), Times.Once);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_UserId_Is_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _bookingService.CreateBookingAsync(request, null));
            Assert.Equal("Bạn không có quyền để thực hiện hành động này", ex.Message);
        }
    }
}
