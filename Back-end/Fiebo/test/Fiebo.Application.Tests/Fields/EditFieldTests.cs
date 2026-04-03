using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class EditFieldTests
    {
        private readonly IFixture _fixture;

        public EditFieldTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private FieldService CreateService()
        {
            return _fixture.Create<FieldService>();
        }

        private void SetupFieldRepository(Mock<IFieldRepository> fieldRepoMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.Fields).Returns(fieldRepoMock.Object);
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserIdNull()
        {
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            SetupFieldRepository(fieldRepoMock);

            var service = CreateService();

            await Assert.ThrowsAsync<UnauthorizedException>(async () =>
                await service.UpdateFieldAsync(ValidRequest(), null, 1));

            fieldRepoMock.Verify(x => x.GetFieldWithVenueAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenFieldNotFound()
        {
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            SetupFieldRepository(fieldRepoMock);

            fieldRepoMock
                .Setup(x => x.GetFieldWithVenueAsync(1))
                .ReturnsAsync((Field?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.UpdateFieldAsync(ValidRequest(), "owner", 1));
        }

        [Fact]
        public async Task Should_ThrowForbidden_WhenVenueMissing()
        {
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            SetupFieldRepository(fieldRepoMock);

            var field = new Field
            {
                Id = 1,
                Name = "Old Name",
                Description = "Old Description",
                SportTypeId = 1,
                Venue = null
            };

            fieldRepoMock
                .Setup(x => x.GetFieldWithVenueAsync(1))
                .ReturnsAsync(field);

            var service = CreateService();

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.UpdateFieldAsync(ValidRequest(), "owner", 1));
        }

        [Fact]
        public async Task Should_ThrowForbidden_WhenUserIsNotOwner()
        {
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            SetupFieldRepository(fieldRepoMock);

            var field = FieldWithOwner("owner-a");

            fieldRepoMock
                .Setup(x => x.GetFieldWithVenueAsync(1))
                .ReturnsAsync(field);

            var service = CreateService();

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.UpdateFieldAsync(ValidRequest(), "owner-b", 1));
        }

        [Fact]
        public async Task Should_UpdateField_WhenRequestValid()
        {
            var fieldRepoMock = _fixture.Freeze<Mock<IFieldRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupFieldRepository(fieldRepoMock);

            var field = FieldWithOwner("owner-1");
            var request = new UpdateFieldRequest
            {
                Name = "New Field Name",
                Description = "Updated Description",
                SportTypeId = 2
            };

            fieldRepoMock
                .Setup(x => x.GetFieldWithVenueAsync(1))
                .ReturnsAsync(field);

            var service = CreateService();

            await service.UpdateFieldAsync(request, "owner-1", 1);

            Assert.Equal("New Field Name", field.Name);
            Assert.Equal("Updated Description", field.Description);
            Assert.Equal(2, field.SportTypeId);

            fieldRepoMock.Verify(x => x.Update(field), Times.Once);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
        }

        private static UpdateFieldRequest ValidRequest()
        {
            return new UpdateFieldRequest
            {
                Name = "Updated Name",
                Description = "Updated",
                SportTypeId = 1
            };
        }

        private static Field FieldWithOwner(string ownerId)
        {
            return new Field
            {
                Id = 1,
                Name = "Old Name",
                Description = "Old Description",
                SportTypeId = 1,
                Venue = new Venue
                {
                    Id = 10,
                    OwnerId = ownerId,
                    Name = "Venue"
                }
            };
        }
    }
}
