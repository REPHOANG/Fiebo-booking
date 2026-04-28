using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Common;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class UploadVenueDocumentTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ICloudinaryService> _cloudinaryServiceMock;
        private readonly Mock<IMapService> _mapServiceMock;
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ILogger<VenueService>> _loggerMock;
        private readonly Mock<INotificationService> _notificationServiceMock;

        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<IVenueDocumentRepository> _venueDocRepoMock;
        private readonly Mock<IVenueDocumentImageRepository> _venueDocImageRepoMock;

        private readonly VenueService _venueService;

        public UploadVenueDocumentTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _cloudinaryServiceMock = new Mock<ICloudinaryService>();
            _mapServiceMock = new Mock<IMapService>();
            _identityServiceMock = new Mock<IIdentityService>();
            _loggerMock = new Mock<ILogger<VenueService>>();
            _notificationServiceMock = new Mock<INotificationService>();

            _venueRepoMock = new Mock<IVenueRepository>();
            _venueDocRepoMock = new Mock<IVenueDocumentRepository>();
            _venueDocImageRepoMock = new Mock<IVenueDocumentImageRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.VenueDocuments).Returns(_venueDocRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.VenueDocumentImages).Returns(_venueDocImageRepoMock.Object);

            _venueService = new VenueService(
                _unitOfWorkMock.Object,
                _mapServiceMock.Object,
                _identityServiceMock.Object,
                _cloudinaryServiceMock.Object,
                _loggerMock.Object,
                _notificationServiceMock.Object
            );
        }

        private CreateVenueDocumentRequest CreateValidRequest()
        {
            return new CreateVenueDocumentRequest
            {
                BusinessDocument = new VenueDocumentDto
                {
                    IssueDate = DateTime.Now.AddYears(-1),
                    ExpiryDate = DateTime.Now.AddYears(1),
                    Images = new List<IFormFile> { CreateMockFile("doc.png", 1024, "image/png").Object }
                }
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
        public async Task UTCID_01_Should_Throw_UnauthorizedException_When_OwnerId_Is_Null()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _venueService.UploadVenueDocumentAsync(1, null, CreateValidRequest()));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_OwnerId_Is_Invalid()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _venueService.UploadVenueDocumentAsync(1, null, CreateValidRequest()));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_NotFoundException_When_Venue_Not_Found()
        {
            // Arrange
            _venueRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Venue)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<NotFoundException>(() => _venueService.UploadVenueDocumentAsync(999, "valid-id", CreateValidRequest()));
            Assert.Equal("Không tìm thấy cơ sở", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_ExpiryDate_Before_IssueDate()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.IssueDate = DateTime.Now.AddYears(-1);
            request.BusinessDocument.ExpiryDate = DateTime.Now.AddYears(-2);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Ngày hết hạn phải sau ngày cấp", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_IssueDate_In_Future()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.IssueDate = DateTime.Now.AddYears(1);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Ngày cấp không được vượt quá ngày hiện tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_ExpiryDate_In_Past()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.ExpiryDate = DateTime.Now.AddYears(-1);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Ngày hết hạn không được nhỏ hơn hoặc bằng ngày hiện tại", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_Too_Many_Images()
        {
            // Arrange
            var request = CreateValidRequest();
            var images = new List<IFormFile>();
            for (int i = 0; i < 6; i++) images.Add(CreateMockFile($"img{i}.png", 1024, "image/png").Object);
            request.BusinessDocument.Images = images;

            var venue = new Venue { Id = 1, Name = "Test", OwnerId = "valid-id" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Tối đa 5 ảnh cho mỗi loại giấy tờ", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Throw_BadRequestException_When_File_Extension_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.Images = new List<IFormFile> { CreateMockFile("test.doc", 1024, "application/msword").Object };

            var venue = new Venue { Id = 1, Name = "Test", OwnerId = "valid-id" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Chỉ chấp nhận ảnh jpg, jpeg, png, webp, svg", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Throw_BadRequestException_When_No_Images()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.Images = new List<IFormFile>();

            var venue = new Venue { Id = 1, Name = "Test", OwnerId = "valid-id" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Phải có ít nhất 1 ảnh cho 1 loại giấy tờ", ex.Message);
        }

        [Fact]
        public async Task UTCID_10_Should_Throw_BadRequestException_When_File_Size_Exceeds_5MB()
        {
            // Arrange
            var request = CreateValidRequest();
            request.BusinessDocument.Images = new List<IFormFile> { CreateMockFile("img.png", 6 * 1024 * 1024, "image/png").Object };

            var venue = new Venue { Id = 1, Name = "Test", OwnerId = "valid-id" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.UploadVenueDocumentAsync(1, "valid-id", request));
            Assert.Equal("Ảnh không được vượt quá 5MB", ex.Message);
        }

        [Fact]
        public async Task UTCID_11_12_Should_Upload_Successfully_When_Valid_Data()
        {
            // Arrange
            var request = CreateValidRequest();
            var venue = new Venue { Id = 1, Name = "Test", OwnerId = "valid-id" };
            _venueRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(venue);
            _cloudinaryServiceMock.Setup(u => u.UploadImageAsync(It.IsAny<IFormFile>()))
                .ReturnsAsync(new UploadImageResultDto { Url = "http://test.com/img.png" });

            // Act
            await _venueService.UploadVenueDocumentAsync(1, "valid-id", request);

            // Assert
            _venueDocRepoMock.Verify(u => u.Add(It.IsAny<VenueDocument>()), Times.Once);
            _venueDocImageRepoMock.Verify(u => u.AddRange(It.IsAny<IEnumerable<VenueDocumentImage>>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Exactly(2));
        }
    }
}
