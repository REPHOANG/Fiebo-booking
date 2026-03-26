using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class CreateFieldTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IVenueRepository> _venueRepo = new();
        private readonly Mock<IFieldRepository> _fieldRepo = new();

        private readonly FieldService _service;

        private const int VenueId = 1;
        private const string OwnerId = "owner-123";
        private const string AdminId = "admin-456";

        public CreateFieldTests()
        {
            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
            _unitOfWork.Setup(x => x.Fields).Returns(_fieldRepo.Object);

            _service = new FieldService(_unitOfWork.Object);
        }

        private static CreateFieldRequest ValidRequest() => new()
        {
            Name = "Sân 5 Người A",
            Description = "Sân cỏ nhân tạo",
            SportTypeId = 1
        };

        private static Venue OwnerVenue() => new()
        {
            Id = VenueId,
            Name = "Venue A",
            OwnerId = OwnerId,
            Status = VenueStatus.Active
        };

        // ================================================================
        //   BR-69: Venue not found → NotFoundException
        // ================================================================

        [Fact]
        public async Task Should_ThrowNotFound_WhenVenueNotFound()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync((Venue?)null);

            await Assert.ThrowsAsync<NotFoundException>(
                () => _service.CreateFieldAsync(VenueId, ValidRequest(), [], OwnerId, AppRoles.FieldOwner));
        }

        // ================================================================
        //   Authorization: Owner cannot create in another owner's venue
        // ================================================================

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerCreatesInOtherVenue()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());

            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
                () => _service.CreateFieldAsync(VenueId, ValidRequest(), [], "other-owner", AppRoles.FieldOwner));

            Assert.Contains("quyền", ex.Message);
        }

        // ================================================================
        //   Authorization: Admin can create in any venue
        // ================================================================

        [Fact]
        public async Task Should_AllowAdmin_ToCreateInAnyVenue()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());
            _fieldRepo.Setup(x => x.IsFieldNameExistsInVenueAsync(VenueId, "Sân 5 Người A")).ReturnsAsync(false);

            var result = await _service.CreateFieldAsync(VenueId, ValidRequest(), [], AdminId, AppRoles.Admin);

            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        // ================================================================
        //   BR-71 / E2: Duplicate field name → ResourceConflictException (MSG69)
        // ================================================================

        [Fact]
        public async Task Should_ThrowConflict_WhenFieldNameAlreadyExists()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());
            _fieldRepo.Setup(x => x.IsFieldNameExistsInVenueAsync(VenueId, "Sân 5 Người A")).ReturnsAsync(true);

            var ex = await Assert.ThrowsAsync<ResourceConflictException>(
                () => _service.CreateFieldAsync(VenueId, ValidRequest(), [], OwnerId, AppRoles.FieldOwner));

            Assert.Contains("đã tồn tại", ex.Message);
        }

        // ================================================================
        //   Normal flow: creates field with Active status (BR-70)
        // ================================================================

        [Fact]
        public async Task Should_CreateField_WithActiveStatus()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());
            _fieldRepo.Setup(x => x.IsFieldNameExistsInVenueAsync(VenueId, "Sân 5 Người A")).ReturnsAsync(false);

            Field? capturedField = null;
            _fieldRepo.Setup(x => x.Add(It.IsAny<Field>()))
                .Callback<Field>(f => capturedField = f);

            await _service.CreateFieldAsync(VenueId, ValidRequest(), [], OwnerId, AppRoles.FieldOwner);

            Assert.NotNull(capturedField);
            Assert.Equal("Sân 5 Người A", capturedField.Name);
            Assert.Equal("Sân cỏ nhân tạo", capturedField.Description);
            Assert.Equal(1, capturedField.SportTypeId);
            Assert.Equal(VenueId, capturedField.VenueId);
            Assert.Equal(FieldStatus.Active, capturedField.Status);
            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        // ================================================================
        //   Normal flow: creates field with images
        // ================================================================

        [Fact]
        public async Task Should_CreateField_WithImages()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());
            _fieldRepo.Setup(x => x.IsFieldNameExistsInVenueAsync(VenueId, "Sân 5 Người A")).ReturnsAsync(false);

            Field? capturedField = null;
            _fieldRepo.Setup(x => x.Add(It.IsAny<Field>()))
                .Callback<Field>(f => capturedField = f);

            var imageUrls = new List<string> { "img1.jpg", "img2.jpg", "img3.jpg" };

            await _service.CreateFieldAsync(VenueId, ValidRequest(), imageUrls, OwnerId, AppRoles.FieldOwner);

            Assert.NotNull(capturedField);
            Assert.Equal(3, capturedField.Images.Count);
            Assert.Contains(capturedField.Images, i => i.ImageUrl == "img1.jpg");
            Assert.Contains(capturedField.Images, i => i.ImageUrl == "img2.jpg");
            Assert.Contains(capturedField.Images, i => i.ImageUrl == "img3.jpg");
        }

        // ================================================================
        //   Normal flow: creates field without images
        // ================================================================

        [Fact]
        public async Task Should_CreateField_WithoutImages()
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId)).ReturnsAsync(OwnerVenue());
            _fieldRepo.Setup(x => x.IsFieldNameExistsInVenueAsync(VenueId, "Sân 5 Người A")).ReturnsAsync(false);

            Field? capturedField = null;
            _fieldRepo.Setup(x => x.Add(It.IsAny<Field>()))
                .Callback<Field>(f => capturedField = f);

            await _service.CreateFieldAsync(VenueId, ValidRequest(), [], OwnerId, AppRoles.FieldOwner);

            Assert.NotNull(capturedField);
            Assert.Empty(capturedField.Images);
        }
    }
}
