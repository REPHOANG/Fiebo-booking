using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Common;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class CreateFieldTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ICloudinaryService> _cloudinaryServiceMock;
        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<IFieldRepository> _fieldRepoMock;

        private readonly FieldService _fieldService;

        public CreateFieldTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _cloudinaryServiceMock = new Mock<ICloudinaryService>();
            _venueRepoMock = new Mock<IVenueRepository>();
            _fieldRepoMock = new Mock<IFieldRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Fields).Returns(_fieldRepoMock.Object);

            _fieldService = new FieldService(_unitOfWorkMock.Object, _cloudinaryServiceMock.Object);
        }

        private CreateFieldRequest CreateValidRequest()
        {
            return new CreateFieldRequest
            {
                Name = "Sân bóng đá 5 người",
                SportTypeId = 1,
                Description = "Mô tả test",
                Images = new List<IFormFile>()
            };
        }

        private Mock<IFormFile> CreateMockFile(string fileName, long length, string contentType)
        {
            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(length);
            fileMock.Setup(_ => _.ContentType).Returns(contentType);
            return fileMock;
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_NotFoundException_When_Venue_Not_Found()
        {
            // Arrange
            _venueRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Venue)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _fieldService.CreateFieldAsync(999, CreateValidRequest(), "valid-id"));
            Assert.Equal("Không tìm thấy cơ sở sân.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_User_Is_Not_Owner()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "real-owner", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _fieldService.CreateFieldAsync(1, CreateValidRequest(), "invalid-owner"));
            Assert.Equal("Bạn không có quyền tạo sân cho cơ sở này", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_ResourceConflictException_When_Name_Exists()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _fieldRepoMock.Setup(u => u.IsFieldNameExistsInVenueAsync(1, "Sân bóng đá 5 người", 1)).ReturnsAsync(true);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ResourceConflictException>(() => _fieldService.CreateFieldAsync(1, CreateValidRequest(), "valid-id"));
            Assert.Equal("Tên sân và loại sân này đã tồn tại trong cơ sở. Vui lòng chọn một tên khác.", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_Too_Many_Images()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _fieldRepoMock.Setup(u => u.IsFieldNameExistsInVenueAsync(1, "Sân bóng đá 5 người", 1)).ReturnsAsync(false);

            var request = CreateValidRequest();
            var images = new List<IFormFile>();
            for (int i = 0; i < 11; i++) images.Add(CreateMockFile($"img{i}.png", 1024, "image/png").Object);
            request.Images = images;

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.CreateFieldAsync(1, request, "valid-id"));
            // Message from ImageValidator for max:10
            Assert.Contains("Tối đa 10 ảnh", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Upload_Fails()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _fieldRepoMock.Setup(u => u.IsFieldNameExistsInVenueAsync(1, "Sân bóng đá 5 người", 1)).ReturnsAsync(false);

            var request = CreateValidRequest();
            request.Images = new List<IFormFile> { CreateMockFile("img.png", 1024, "image/png").Object };

            _cloudinaryServiceMock.Setup(u => u.UploadImageAsync(It.IsAny<IFormFile>())).ReturnsAsync((UploadImageResultDto)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _fieldService.CreateFieldAsync(1, request, "valid-id"));
            Assert.Equal("Có lỗi xảy ra khi tải lên hình ảnh lên hệ thống.", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Create_Successfully_Without_Images()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _fieldRepoMock.Setup(u => u.IsFieldNameExistsInVenueAsync(1, "Sân bóng đá 5 người", 1)).ReturnsAsync(false);

            var request = CreateValidRequest();
            request.Images = new List<IFormFile>();

            // Act
            var result = await _fieldService.CreateFieldAsync(1, request, "valid-id");

            // Assert
            _fieldRepoMock.Verify(u => u.Add(It.IsAny<Field>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task UTCID_07_Should_Create_Successfully_With_Images()
        {
            // Arrange
            var venue = new Venue { Id = 1, OwnerId = "valid-id", Name = "Sân test" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _fieldRepoMock.Setup(u => u.IsFieldNameExistsInVenueAsync(1, "Sân bóng đá 5 người", 1)).ReturnsAsync(false);

            var request = CreateValidRequest();
            request.Images = new List<IFormFile> { CreateMockFile("img.png", 1024, "image/png").Object };

            _cloudinaryServiceMock.Setup(u => u.UploadImageAsync(It.IsAny<IFormFile>()))
                .ReturnsAsync(new UploadImageResultDto { PublicId = "p1", Url = "http://test.com/img.png" });

            // Act
            var result = await _fieldService.CreateFieldAsync(1, request, "valid-id");

            // Assert
            _fieldRepoMock.Verify(u => u.Add(It.Is<Field>(f => f.Images.Count == 1)), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }
    }
}
