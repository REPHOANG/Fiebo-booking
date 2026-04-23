using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Venues
{
    public class SubmitVenueDraftAsyncTests
    {
        private readonly IFixture _fixture;

        public SubmitVenueDraftAsyncTests()
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
        // ?? INVALID
        // =========================

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenOwnerIdNull()
        {
            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(() =>
                service.SubmitVenueDraftAsync(1, null));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenVenueNotExist()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetVenueWithDocumentsAsync(It.IsAny<int>()))
                   .ReturnsAsync((Venue?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(() =>
                service.SubmitVenueDraftAsync(1, "owner"));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenNotOwner()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetVenueWithDocumentsAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateVenue("other", VenueStatus.Draft, true, true));

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(() =>
                service.SubmitVenueDraftAsync(1, "owner"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenStatusNotDraft()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetVenueWithDocumentsAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateVenue("owner", VenueStatus.Pending, true, true));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(() =>
                service.SubmitVenueDraftAsync(1, "owner"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenMissingBusinessLicense()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();

            uowMock.Setup(x => x.Venues.GetVenueWithDocumentsAsync(It.IsAny<int>()))
                   .ReturnsAsync(CreateVenue("owner", VenueStatus.Draft, false, true));

            var service = CreateService();

            await Assert.ThrowsAsync<BadRequestException>(() =>
                service.SubmitVenueDraftAsync(1, "owner"));
        }


        // =========================
        // ?? VALID
        // =========================

        [Fact]
        public async Task Should_UpdateStatusToPending_WhenValid()
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var venueRepoMock = _fixture.Freeze<Mock<IVenueRepository>>();

            uowMock.Setup(x => x.Venues).Returns(venueRepoMock.Object);

            var venue = CreateVenue("owner", VenueStatus.Draft, true, true);

            uowMock.Setup(x => x.Venues.GetVenueWithDocumentsAsync(It.IsAny<int>()))
                   .ReturnsAsync(venue);

            var service = CreateService();

            await service.SubmitVenueDraftAsync(1, "owner");

            Assert.Equal(VenueStatus.Pending, venue.Status);

            venueRepoMock.Verify(x => x.Update(venue), Times.Once);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        // =========================
        // ?? HELPER
        // =========================

        private Venue CreateVenue(
            string ownerId,
            VenueStatus status,
            bool hasBusiness,
            bool hasLand)
        {
            var docs = new List<VenueDocument>();

            if (hasBusiness)
            {
                docs.Add(new VenueDocument
                {
                    DocumentType = DocumentType.BusinessLicense
                });
            }

            return new Venue
            {
                Id = 1,
                Name = "Test Venue",     // required
                OwnerId = ownerId,      // required
                Status = status,
                Documents = docs,
                OpenTime = new TimeOnly(8, 0),
                CloseTime = new TimeOnly(22, 0),
                ProvinceId = 1,
                WardId = 1,
                Latitude = 10,
                Longitude = 10
            };
        }
    }
}

