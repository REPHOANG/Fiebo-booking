using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class UpdateFieldTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ICloudinaryService> _cloudinaryServiceMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<IFieldRepository> _fieldRepoMock;
        private readonly Mock<ISportTypeRepository> _sportTypeRepoMock;

        private readonly FieldService _fieldService;

        public UpdateFieldTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _cloudinaryServiceMock = new Mock<ICloudinaryService>();
            _venueRepoMock = new Mock<IVenueRepository>();
            _fieldRepoMock = new Mock<IFieldRepository>();
            _sportTypeRepoMock = new Mock<ISportTypeRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Fields).Returns(_fieldRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.SportTypes).Returns(_sportTypeRepoMock.Object);

            _fieldService = new FieldService(_unitOfWorkMock.Object, _cloudinaryServiceMock.Object);
        }

        private UpdateFieldRequest CreateValidRequest()
        {
            return new UpdateFieldRequest
            {
                Name = "Sân bóng đá 5 người cập nhật",
                Description = "Mô tả sân tập cập nhật",
                SportTypeId = 2
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_UserId_Is_Null()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _fieldService.UpdateFieldAsync(CreateValidRequest(), null, 1));
            Assert.Equal("Bạn cần đăng nhập để thực hiện hành động này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_NotFoundException_When_Field_Not_Found()
        {
            // Arrange
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(999)).ReturnsAsync((Field)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _fieldService.UpdateFieldAsync(CreateValidRequest(), "valid-id", 999));
            Assert.Equal("Không tìm thấy sân.", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ForbiddenException_When_Venue_Is_Null()
        {
            // Arrange
            var field = new Field { Id = 1, Name = "Sân test", Venue = null };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _fieldService.UpdateFieldAsync(CreateValidRequest(), "valid-id", 1));
            Assert.Equal("Bạn không có quyền chỉnh sửa sân này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_ForbiddenException_When_User_Is_Not_Owner()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "real-owner", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _fieldService.UpdateFieldAsync(CreateValidRequest(), "invalid-owner", 1));
            Assert.Equal("Bạn không có quyền chỉnh sửa sân này.", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_06_Should_Throw_BadRequestException_When_Name_Is_Null_Or_Empty()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);

            var request = CreateValidRequest();
            request.Name = "";

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.UpdateFieldAsync(request, "valid-id", 1));
            Assert.Equal("Tên sân không được để trống.", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_Name_Exceeds_100_Chars()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);

            var request = CreateValidRequest();
            request.Name = new string('A', 101);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.UpdateFieldAsync(request, "valid-id", 1));
            Assert.Equal("Tên sân không được vượt quá 100 ký tự.", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Update_Successfully_When_Valid_Boundary_Data()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);
            _sportTypeRepoMock.Setup(u => u.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(new SportType { Id = 2, Name = "Bóng đá" });

            var request = CreateValidRequest();
            request.Name = new string('A', 100);

            // Act
            await _fieldService.UpdateFieldAsync(request, "valid-id", 1);

            // Assert
            Assert.Equal(request.Name, field.Name);
            _fieldRepoMock.Verify(u => u.Update(field), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_Description_Exceeds_500_Chars()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);

            var request = CreateValidRequest();
            request.Description = new string('D', 501);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.UpdateFieldAsync(request, "valid-id", 1));
            Assert.Equal("Mô tả không được vượt quá 500 ký tự.", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_SportType_Not_Found()
        {
            // Arrange
            var venue = new Venue { Id = 10, OwnerId = "valid-id", Name = "Sân test" };
            var field = new Field { Id = 1, Name = "Sân test", Venue = venue };
            _fieldRepoMock.Setup(u => u.GetFieldWithVenueAsync(1)).ReturnsAsync(field);
            _sportTypeRepoMock.Setup(u => u.GetByIdAsync(0, It.IsAny<CancellationToken>())).ReturnsAsync((SportType)null);

            var request = CreateValidRequest();
            request.SportTypeId = 0;

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.UpdateFieldAsync(request, "valid-id", 1));
            Assert.Equal("Môn thể thao không hợp lệ.", ex.Message);
        }
    }
}
