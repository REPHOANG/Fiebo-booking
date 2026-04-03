using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Common;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Text;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class CreateVenueAsyncTests
    {
        private readonly IFixture _fixture;

        public CreateVenueAsyncTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private VenueService CreateService()
        {
            return _fixture.Create<VenueService>();
        }

        // =========================
        // 🔴 INVALID
        // =========================

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerIdNull()
        {
            var service = CreateService();
            var request = ValidRequest();

            await Assert.ThrowsAsync<UnauthorizedException>(async () =>
                await service.CreateVenueAsync(request, null));
        }

        [Theory]
        [InlineData(10, 9)]
        [InlineData(10, 10)]
        public async Task Should_ThrowBadRequest_WhenCloseTimeInvalid(int open, int close)
        {
            var service = CreateService();
            var request = ValidRequest();

            request.OpenTime = new TimeOnly(open, 0);
            request.CloseTime = new TimeOnly(close, 0);

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateVenueAsync(request, "owner"));
        }

        // =========================
        // 🟡 BOUNDARY
        // =========================

        [Fact]
        public async Task Should_Pass_WhenCloseTimeJustGreater()
        {
            var service = CreateService();
            var request = ValidRequest();

            request.OpenTime = new TimeOnly(10, 0);
            request.CloseTime = request.OpenTime.AddMinutes(1);

            var result = await service.CreateVenueAsync(request, "owner");

            Assert.NotNull(result);
        }

        // =========================
        // 🟢 VALID + PATH + BRANCH
        // =========================

        [Fact]
        public async Task Should_CreateVenue_WithoutThumbnail()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var cloudMock = _fixture.Freeze<Mock<ICloudinaryService>>();

            var service = CreateService();
            var request = ValidRequest();
            request.Thumbnail = null;

            var result = await service.CreateVenueAsync(request, "owner");

            Assert.NotNull(result);
            Assert.Equal("Draft", result.Status);

            venueRepoMock.Verify(x => x.Add(It.IsAny<Venue>()), Times.Once);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            cloudMock.Verify(x => x.UploadImageAsync(It.IsAny<IFormFile>()), Times.Never);
        }

        [Fact]
        public async Task Should_CreateVenue_WithThumbnail()
        {
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var cloudMock = _fixture.Freeze<Mock<ICloudinaryService>>();

            cloudMock
                .Setup(x => x.UploadImageAsync(It.IsAny<IFormFile>()))
                .ReturnsAsync(new UploadImageResultDto { Url = "url" });

            var service = CreateService();
            var request = ValidRequest();

            // ✅ FIX: mock file hợp lệ
            request.Thumbnail = CreateFakeImage();

            var result = await service.CreateVenueAsync(request, "owner");

            Assert.NotNull(result);
            Assert.Equal("Draft", result.Status);

            venueRepoMock.Verify(x => x.Add(It.IsAny<Venue>()), Times.Once);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            cloudMock.Verify(x => x.UploadImageAsync(It.IsAny<IFormFile>()), Times.Once);
        }

        // =========================
        // 🧩 HELPER
        // =========================

        private CreateVenueRequest ValidRequest()
        {
            return new CreateVenueRequest
            {
                Name = "Test Venue",
                OpenTime = new TimeOnly(8, 0),
                CloseTime = new TimeOnly(22, 0),
                Description = "Test",
                AddressDetail = "Address",
                ProvinceId = 1,
                WardId = 1,
                Latitude = 10,
                Longitude = 10
            };
        }

        private IFormFile CreateFakeImage()
        {
            var content = "fake image content";
            var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

            var mock = new Mock<IFormFile>();
            mock.Setup(f => f.OpenReadStream()).Returns(ms);
            mock.Setup(f => f.FileName).Returns("test.jpg"); // quan trọng
            mock.Setup(f => f.Length).Returns(ms.Length);
            mock.Setup(f => f.ContentType).Returns("image/jpeg");

            return mock.Object;
        }
    }
}
