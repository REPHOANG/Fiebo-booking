using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Exceptions;
using Moq;
using Moq.AutoMock;
using Xunit;

namespace Fiebo.Application.Tests.Auth
{
    public class UpdateUserProfileTests
    {
        private readonly AutoMocker _mocker;
        private readonly AuthService _authService;

        public UpdateUserProfileTests()
        {
            _mocker = new AutoMocker();
            _authService = _mocker.CreateInstance<AuthService>();
        }

        [Fact]
        public async Task Should_ReturnSuccess_WhenUpdateSuccess()
        {
            // Arrange
            var userId = "user1";

            var request = new UserProfileRequest
            {
                FullName = "Test User",
                PhoneNumber = "0901234567"
            };

            var response = new ServiceResponse
            {
                IsSuccess = true,
                Message = "Cập nhật thông tin người dùng thành công"
            };

            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.UpdateUserProfileAsync(userId, request))
                .ReturnsAsync(response);

            // Act
            var result = await _authService.UpdateUserProfileAsync(userId, request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal(response.Message, result.Message);
        }

        [Fact]
        public async Task Should_ThrowNotFoundException_WhenUserNotFound()
        {
            // Arrange
            var userId = "user1";

            var request = new UserProfileRequest();

            _ = _mocker.GetMock<IIdentityService>()
                .Setup(x => x.UpdateUserProfileAsync(userId, request))
                .ReturnsAsync((ServiceResponse?)null!);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _authService.UpdateUserProfileAsync(userId, request));
        }
    }
}