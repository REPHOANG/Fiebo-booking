//using Fiebo.Application.DTOs.Field;
//using Fiebo.Application.Services;
//using Fiebo.Domain.Constants;
//using Fiebo.Domain.Entities;
//using Fiebo.Domain.Enums;
//using Fiebo.Domain.Exceptions;
//using Fiebo.Domain.Repositories;
//using Moq;
//using Xunit;

//namespace Fiebo.Application.Tests.Venues
//{
//    public class UpdateVenueTests
//    {
//        private readonly Mock<IUnitOfWork> _unitOfWork = new();
//        private readonly Mock<IVenueRepository> _venueRepo = new();

//        private readonly VenueService _service;

//        private const int VenueId = 1;
//        private const string OwnerId = "owner-123";
//        private const string AdminId = "admin-456";
//        private const string OtherOwnerId = "other-789";

//        public UpdateVenueTests()
//        {
//            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
//            _service = new VenueService(_unitOfWork.Object, null!, null!, null!, null!);
//        }

//        private static UpdateVenueRequest ValidRequest() => new()
//        {
//            Name = "Sân Bóng ABC",
//            Description = "Mô tả mới",
//            AddressDetail = "123 Đường XYZ",
//            ProvinceId = 1,
//            WardId = 10,
//            Longitude = 105.8,
//            Latitude = 21.0,
//            OpenTime = new TimeOnly(6, 0, 0),
//            CloseTime = new TimeOnly(22, 0, 0)
//        };

//        private static Venue ExistingVenue() => new()
//        {
//            Id = VenueId,
//            Name = "Old Name",
//            OwnerId = OwnerId,
//            Status = VenueStatus.Active,
//            OpenTime = new TimeOnly(7, 0, 0),
//            CloseTime = new TimeOnly(21, 0, 0)
//        };

//        // ================================================================
//        //   Venue not found → NotFoundException
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowNotFound_WhenVenueNotFound()
//        {
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync((Venue?)null);

//            await Assert.ThrowsAsync<NotFoundException>(
//                () => _service.UpdateVenueAsync(VenueId, ValidRequest(), null, OwnerId, AppRoles.FieldOwner));
//        }

//        // ================================================================
//        //   BR-62: Owner cannot edit another owner's venue
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowUnauthorized_WhenOwnerEditsOtherVenue()
//        {
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(ExistingVenue());

//            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _service.UpdateVenueAsync(VenueId, ValidRequest(), null, OtherOwnerId, AppRoles.FieldOwner));

//            Assert.Contains("quyền", ex.Message);
//        }

//        // ================================================================
//        //   BR-62: Admin can edit any venue
//        // ================================================================

//        [Fact]
//        public async Task Should_AllowAdmin_ToEditAnyVenue()
//        {
//            var venue = ExistingVenue();
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(venue);

//            var request = ValidRequest();
//            await _service.UpdateVenueAsync(VenueId, request, null, AdminId, AppRoles.Admin);

//            Assert.Equal("Sân Bóng ABC", venue.Name);
//            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
//        }

//        // ================================================================
//        //   E2: CloseTime <= OpenTime → BadRequestException (MSG63)
//        // ================================================================

//        [Fact]
//        public async Task Should_ThrowBadRequest_WhenCloseTimeBeforeOpenTime()
//        {
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(ExistingVenue());

//            var request = ValidRequest();
//            request.OpenTime = new TimeOnly(18, 0, 0);
//            request.CloseTime = new TimeOnly(8, 0, 0);

//            var ex = await Assert.ThrowsAsync<BadRequestException>(
//                () => _service.UpdateVenueAsync(VenueId, request, null, OwnerId, AppRoles.FieldOwner));

//            Assert.Contains("Giờ đóng cửa phải sau giờ mở cửa", ex.Message);
//        }

//        [Fact]
//        public async Task Should_ThrowBadRequest_WhenCloseTimeEqualsOpenTime()
//        {
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(ExistingVenue());

//            var request = ValidRequest();
//            request.OpenTime = new TimeOnly(10, 0, 0);
//            request.CloseTime = new TimeOnly(10, 0, 0);

//            await Assert.ThrowsAsync<BadRequestException>(
//                () => _service.UpdateVenueAsync(VenueId, request, null, OwnerId, AppRoles.FieldOwner));
//        }

//        // ================================================================
//        //   Normal flow: Owner updates all fields successfully
//        // ================================================================

//        [Fact]
//        public async Task Should_UpdateAllFields_WhenValidRequest()
//        {
//            var venue = ExistingVenue();
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(venue);

//            var request = ValidRequest();
//            await _service.UpdateVenueAsync(VenueId, request, null, OwnerId, AppRoles.FieldOwner);

//            Assert.Equal("Sân Bóng ABC", venue.Name);
//            Assert.Equal("Mô tả mới", venue.Description);
//            Assert.Equal("123 Đường XYZ", venue.AddressDetail);
//            Assert.Equal(1, venue.ProvinceId);
//            Assert.Equal(10, venue.WardId);
//            Assert.Equal(105.8, venue.Longitude);
//            Assert.Equal(21.0, venue.Latitude);
//            Assert.Equal(new TimeOnly(6, 0, 0), venue.OpenTime);
//            Assert.Equal(new TimeOnly(22, 0, 0), venue.CloseTime);
//            Assert.NotNull(venue.UpdatedAt);
//            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
//        }

//        // ================================================================
//        //   Thumbnail: updated when new URL provided
//        // ================================================================

//        [Fact]
//        public async Task Should_UpdateThumbnail_WhenNewUrlProvided()
//        {
//            var venue = ExistingVenue();
//            venue.ThumbnailUrl = "old-image.jpg";
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(venue);

//            await _service.UpdateVenueAsync(VenueId, ValidRequest(), "new-image.jpg", OwnerId, AppRoles.FieldOwner);

//            Assert.Equal("new-image.jpg", venue.ThumbnailUrl);
//        }

//        // ================================================================
//        //   Thumbnail: kept when no new URL provided
//        // ================================================================

//        [Fact]
//        public async Task Should_KeepExistingThumbnail_WhenNoNewUrl()
//        {
//            var venue = ExistingVenue();
//            venue.ThumbnailUrl = "existing-image.jpg";
//            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(venue);

//            await _service.UpdateVenueAsync(VenueId, ValidRequest(), null, OwnerId, AppRoles.FieldOwner);

//            Assert.Equal("existing-image.jpg", venue.ThumbnailUrl);
//        }
//    }
//}
