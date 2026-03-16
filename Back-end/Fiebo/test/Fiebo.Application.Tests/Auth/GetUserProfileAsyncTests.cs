using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.AutoMock;
using Xunit;

namespace Fiebo.Application.Tests.Auth
{
    public class GetUserProfileAsyncTests
    {
        private readonly AutoMocker _mocker;
        private readonly AuthService _authService;

        public GetUserProfileAsyncTests()
        {
            _mocker = new AutoMocker();

            // Auto inject tất cả dependency
            _authService = _mocker.CreateInstance<AuthService>();
        }

        [Fact]
        public async Task GetUserProfileAsync_ShouldReturnProfile_WhenUserExists()
        {
            // Arrange
            var userId = "user1";

            var profile = new UserProfileResponse
            {
                Id = userId,
                Email = "test@email.com",
                FullName = "Test User",
                PhoneNumber = "0988982771",
                DateOfBirth = new DateOnly(1990, 1, 1),
                Roles = "Customer"
            };

            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.GetUserProfileAsync(userId))
                .ReturnsAsync(profile);

            // Act
            var result = await _authService.GetUserProfileAsync(userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(profile.Id, result.Id);
            Assert.Equal(profile.Email, result.Email);
        }

        [Fact]
        public async Task GetUserProfileAsync_ShouldThrowNotFoundException_WhenUserNotFound()
        {
            // Arrange
            var userId = "user1";

            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.GetUserProfileAsync(userId))
                .ReturnsAsync((UserProfileResponse?)null);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _authService.GetUserProfileAsync(userId));
        }
    }
}