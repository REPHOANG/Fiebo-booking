//using Fiebo.Application.Services;
//using Fiebo.Domain.Entities;
//using Fiebo.Domain.Enums;
//using Fiebo.Domain.Exceptions;
//using Fiebo.Domain.Repositories;
//using Moq;
//using Xunit;

//namespace Fiebo.Application.Tests.Fields
//{
//    public class ChangeFieldStatusTests
//    {
//        private readonly Mock<IUnitOfWork> _unitOfWork = new();
//        private readonly Mock<IVenueRepository> _venueRepo = new();
//        private readonly Mock<IFieldRepository> _fieldRepo = new();
//        private readonly Mock<IBookingDetailRepository> _bookingDetailRepo = new();

//        private readonly FieldService _service;

//        private const int VenueId = 1;
//        private const int FieldId = 10;
//        private const string OwnerId = "owner-123";

//        public ChangeFieldStatusTests()
//        {
//            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
//            _unitOfWork.Setup(x => x.Fields).Returns(_fieldRepo.Object);
//            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingDetailRepo.Object);

//            _service = new FieldService(_unitOfWork.Object);
//        }

//        private void SetupVenue(Venue? venue)
//        {
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(venue);
//        }

//        private void SetupField(Field? field)
//        {
//            _fieldRepo.Setup(x => x.GetByIdAsync(FieldId)).ReturnsAsync(field);
//        }

//        // ================================================================
//        //   BR-55: Venue not found → UnauthorizedException
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowUnauthorized_WhenVenueNotFound()
//        {
//            SetupVenue(null);

//            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId));

//            Assert.Contains("quyền", ex.Message);
//        }

//        // ================================================================
//        //   BR-55: Venue belongs to different owner
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowUnauthorized_WhenVenueBelongsToDifferentOwner()
//        {
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = "someone-else" });

//            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId));

//            Assert.Contains("quyền", ex.Message);
//        }

//        // ================================================================
//        //   Field not found → NotFoundException
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowNotFound_WhenFieldNotFound()
//        {
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(null);

//            await Assert.ThrowsAsync<NotFoundException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId));
//        }

//        // ================================================================
//        //   Field belongs to different venue → NotFoundException
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowNotFound_WhenFieldBelongsToDifferentVenue()
//        {
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(new Field { Id = FieldId, Name = "F", VenueId = 999, Status = FieldStatus.Active });

//            await Assert.ThrowsAsync<NotFoundException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId));
//        }

//        // ================================================================
//        //   Same status → BadRequestException
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowBadRequest_WhenStatusAlreadySame()
//        {
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(new Field { Id = FieldId, Name = "F", VenueId = VenueId, Status = FieldStatus.Active });

//            await Assert.ThrowsAsync<BadRequestException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Active, OwnerId));
//        }

//        // ================================================================
//        //   E1 / BR-56: Block deactivation when upcoming bookings exist
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowBadRequest_WhenDeactivatingWithUpcomingBookings()
//        {
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(new Field { Id = FieldId, Name = "F", VenueId = VenueId, Status = FieldStatus.Active });
//            _bookingDetailRepo.Setup(x => x.HasUpcomingBookingsForFieldAsync(FieldId)).ReturnsAsync(true);

//            var ex = await Assert.ThrowsAsync<BadRequestException>(
//                () => _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId));

//            Assert.Contains("lịch đặt sắp tới", ex.Message);
//        }

//        // ================================================================
//        //   Normal flow: Active → Inactive (no upcoming bookings)
//        // ================================================================

//        [Fact]
//        public async Task Should_DeactivateField_WhenNoUpcomingBookings()
//        {
//            var field = new Field { Id = FieldId, Name = "F", VenueId = VenueId, Status = FieldStatus.Active };
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(field);
//            _bookingDetailRepo.Setup(x => x.HasUpcomingBookingsForFieldAsync(FieldId)).ReturnsAsync(false);

//            await _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Inactive, OwnerId);

//            Assert.Equal(FieldStatus.Inactive, field.Status);
//            Assert.NotNull(field.UpdatedAt);
//            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
//        }

//        // ================================================================
//        //   Normal flow: Inactive → Active (no booking check needed)
//        // ================================================================

//        [Fact]
//        public async Task Should_ActivateField_WithoutBookingCheck()
//        {
//            var field = new Field { Id = FieldId, Name = "F", VenueId = VenueId, Status = FieldStatus.Inactive };
//            SetupVenue(new Venue { Id = VenueId, Name = "V", OwnerId = OwnerId });
//            SetupField(field);

//            await _service.ChangeFieldStatusAsync(VenueId, FieldId, FieldStatus.Active, OwnerId);

//            Assert.Equal(FieldStatus.Active, field.Status);
//            _bookingDetailRepo.Verify(x => x.HasUpcomingBookingsForFieldAsync(It.IsAny<int>()), Times.Never);
//            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
//        }
//    }
//}
