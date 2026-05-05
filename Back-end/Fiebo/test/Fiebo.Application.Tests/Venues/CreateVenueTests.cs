using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Common;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class CreateVenueTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IMapService> _mapServiceMock;
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ICloudinaryService> _cloudinaryServiceMock;
        private readonly Mock<ILogger<VenueService>> _loggerMock;
        private readonly Mock<INotificationService> _notificationServiceMock;

        private readonly Mock<IVenueRepository> _venueRepoMock;
        private readonly Mock<IProvinceRepository> _provinceRepoMock;
        private readonly Mock<IWardRepository> _wardRepoMock;

        private readonly VenueService _venueService;

        public CreateVenueTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _mapServiceMock = new Mock<IMapService>();
            _identityServiceMock = new Mock<IIdentityService>();
            _cloudinaryServiceMock = new Mock<ICloudinaryService>();
            _loggerMock = new Mock<ILogger<VenueService>>();
            _notificationServiceMock = new Mock<INotificationService>();

            _venueRepoMock = new Mock<IVenueRepository>();
            _provinceRepoMock = new Mock<IProvinceRepository>();
            _wardRepoMock = new Mock<IWardRepository>();

            _unitOfWorkMock.Setup(u => u.Venues).Returns(_venueRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Provinces).Returns(_provinceRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Wards).Returns(_wardRepoMock.Object);

            _venueService = new VenueService(
                _unitOfWorkMock.Object,
                _mapServiceMock.Object,
                _identityServiceMock.Object,
                _cloudinaryServiceMock.Object,
                _loggerMock.Object,
                _notificationServiceMock.Object
            );
        }

        private CreateVenueRequest CreateValidRequest()
        {
            return new CreateVenueRequest
            {
                Name = "Sân bóng đá 5 cửa ô",
                OpenTime = new TimeOnly(8, 30),
                CloseTime = new TimeOnly(22, 0),
                Description = "Sân có nhân tạo siêu đẹp",
                AddressDetail = "123 Street",
                ProvinceId = 1,
                WardId = 1,
                Latitude = "21.0285",
                Longitude = "105.8542",
                Thumbnail = null
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
            // Arrange
            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _venueService.CreateVenueAsync(request, null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_Throw_UnauthorizedException_When_OwnerId_Is_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _venueService.CreateVenueAsync(request, null));
            Assert.Equal("Bạn cần đăng nhập", ex.Message);
        }

        [Fact]
        public async Task UTCID_03_Should_Throw_BadRequestException_When_CloseTime_Before_OpenTime()
        {
            // Arrange
            var request = CreateValidRequest();
            request.OpenTime = new TimeOnly(22, 0);
            request.CloseTime = new TimeOnly(8, 0);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Giờ đóng cửa phải sau giờ mở cửa", ex.Message);
        }

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_OpenTime_Not_Multiple_Of_30m()
        {
            // Arrange
            var request = CreateValidRequest();
            request.OpenTime = new TimeOnly(8, 29);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Giờ mở cửa và đóng cửa phải là các khoảng thời gian chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_CloseTime_Not_Multiple_Of_30m()
        {
            // Arrange
            var request = CreateValidRequest();
            request.CloseTime = new TimeOnly(21, 59);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Giờ mở cửa và đóng cửa phải là các khoảng thời gian chẵn 30 phút", ex.Message);
        }

        [Fact]
        public async Task UTCID_06_Should_Throw_BadRequestException_When_ProvinceId_Is_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();
            request.ProvinceId = 999;
            _provinceRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Province)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Tỉnh/Thành phố không hợp lệ", ex.Message);
        }

        [Fact]
        public async Task UTCID_07_Should_Throw_BadRequestException_When_WardId_Is_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();
            request.WardId = 9999;
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(9999)).ReturnsAsync((Ward)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Phường/Xã không hợp lệ hoặc không thuộc tỉnh/thành phố đã chọn", ex.Message);
        }

        [Fact]
        public async Task UTCID_08_Should_Throw_BadRequestException_When_File_Extension_Is_Invalid()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Thumbnail = CreateMockFile("test.doc", 1024, "application/msword").Object;
            
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Ward { Id = 1, ProvinceId = 1, Name = "Ba Dinh" });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Chỉ chấp nhận ảnh jpg, jpeg, png, webp, svg", ex.Message);
        }

        [Fact]
        public async Task UTCID_09_Should_Create_Successfully_When_File_Size_Is_5MB()
        {
            // Arrange
            var request = CreateValidRequest();
            var fileMock = CreateMockFile("test.png", 5 * 1024 * 1024, "image/png");
            request.Thumbnail = fileMock.Object;
            
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Ward { Id = 1, ProvinceId = 1, Name = "Ba Dinh" });
            _cloudinaryServiceMock.Setup(u => u.UploadImageAsync(It.IsAny<IFormFile>())).ReturnsAsync(new UploadImageResultDto { Url = "http://test.com/img.png" });

            // Act
            var result = await _venueService.CreateVenueAsync(request, "valid-id");

            // Assert
            Assert.NotNull(result);
            _venueRepoMock.Verify(u => u.Add(It.IsAny<Venue>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task UTCID_10_Should_Create_Successfully_When_File_Size_Is_4MB()
        {
            // Arrange
            var request = CreateValidRequest();
            var fileMock = CreateMockFile("test.png", 4 * 1024 * 1024, "image/png");
            request.Thumbnail = fileMock.Object;
            
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Ward { Id = 1, ProvinceId = 1, Name = "Ba Dinh" });
            _cloudinaryServiceMock.Setup(u => u.UploadImageAsync(It.IsAny<IFormFile>())).ReturnsAsync(new UploadImageResultDto { Url = "http://test.com/img.png" });

            // Act
            var result = await _venueService.CreateVenueAsync(request, "valid-id");

            // Assert
            Assert.NotNull(result);
            _venueRepoMock.Verify(u => u.Add(It.IsAny<Venue>()), Times.Once);
        }

        [Fact]
        public async Task UTCID_11_Should_Throw_BadRequestException_When_File_Size_Exceeds_5MB()
        {
            // Arrange
            var request = CreateValidRequest();
            var fileMock = CreateMockFile("test.png", 6 * 1024 * 1024, "image/png");
            request.Thumbnail = fileMock.Object;
            
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Ward { Id = 1, ProvinceId = 1, Name = "Ba Dinh" });

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _venueService.CreateVenueAsync(request, "valid-id"));
            Assert.Equal("Ảnh không được vượt quá 5MB", ex.Message);
        }

        [Fact]
        public async Task UTCID_12_Should_Create_Successfully_When_Thumbnail_Is_Null()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Thumbnail = null;
            
            _provinceRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Province { Id = 1, Name = "Hanoi" });
            _wardRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(new Ward { Id = 1, ProvinceId = 1, Name = "Ba Dinh" });

            // Act
            var result = await _venueService.CreateVenueAsync(request, "valid-id");

            // Assert
            Assert.NotNull(result);
            _venueRepoMock.Verify(u => u.Add(It.IsAny<Venue>()), Times.Once);
        }
    }
}
