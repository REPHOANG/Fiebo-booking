using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Text;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class UploadVenueDocumentAsyncTests
    {
        private readonly IFixture _fixture;

        public UploadVenueDocumentAsyncTests()
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

            await Assert.ThrowsAsync<UnauthorizedException>(() =>
                service.UploadVenueDocumentAsync(1, null, ValidRequest()));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenVenueNotExist()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetByIdAsync(It.IsAny<int>()))
                   .ReturnsAsync((Venue?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(() =>
                service.UploadVenueDocumentAsync(1, "owner", ValidRequest()));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenNotOwner()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetByIdAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateValidVenue("other"));

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(() =>
                service.UploadVenueDocumentAsync(1, "owner", ValidRequest()));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenImagesInvalid()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetByIdAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateValidVenue("owner"));

            var service = CreateService();
            var request = ValidRequest();

            // ❌ invalid file
            request.BusinessDocument.Images = new List<IFormFile> { Mock.Of<IFormFile>() };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                service.UploadVenueDocumentAsync(1, "owner", request));
        }

        // =========================
        // 🟢 VALID
        // =========================

        [Fact]
        public async Task Should_UploadDocuments_Successfully()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var docRepoMock = _fixture.Freeze<Mock<IVenueDocumentRepository>>();
            var imageRepoMock = _fixture.Freeze<Mock<IVenueDocumentImageRepository>>();

            uowMock.Setup(x => x.Venues.GetByIdAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateValidVenue("owner"));

            var service = CreateService();
            var request = ValidRequest();

            await service.UploadVenueDocumentAsync(1, "owner", request);

            // verify add document (2 loại)
            docRepoMock.Verify(x => x.Add(It.IsAny<VenueDocument>()), Times.Exactly(2));

            // save 2 lần
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Exactly(2));

            // add images
            imageRepoMock.Verify(x => x.AddRange(It.IsAny<List<VenueDocumentImage>>()), Times.Once);
        }

        // =========================
        // 🧩 HELPER
        // =========================

        private Venue CreateValidVenue(string ownerId)
        {
            return new Venue
            {
                Id = 1,
                Name = "Test Venue",        // ✅ required
                OwnerId = ownerId,         // ✅ required
                OpenTime = new TimeOnly(8, 0),
                CloseTime = new TimeOnly(22, 0),
                ProvinceId = 1,
                WardId = 1,
                Latitude = 10,
                Longitude = 10,
                Status = VenueStatus.Draft
            };
        }

        private CreateVenueDocumentRequest ValidRequest()
        {
            return new CreateVenueDocumentRequest
            {
                BusinessDocument = new VenueDocumentDto
                {
                    IssueDate = DateTime.UtcNow,
                    ExpiryDate = DateTime.UtcNow.AddYears(1),
                    Images = new List<IFormFile> { CreateFakeImage() }
                }
            };
        }

        private IFormFile CreateFakeImage()
        {
            var content = new string('a', 5000);
            var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

            var mock = new Mock<IFormFile>();
            mock.Setup(f => f.OpenReadStream()).Returns(ms);
            mock.Setup(f => f.FileName).Returns("test.jpg");
            mock.Setup(f => f.Length).Returns(ms.Length);
            mock.Setup(f => f.ContentType).Returns("image/jpeg");

            return mock.Object;
        }
    }
}
