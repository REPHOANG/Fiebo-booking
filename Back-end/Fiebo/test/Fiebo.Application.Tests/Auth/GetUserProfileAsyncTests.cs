using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Auth
{
    public class GetUserProfileAsyncTests
    {
        private readonly Mock<IIdentityService> _identityServiceMock;
        private readonly Mock<ITokenService> _tokenServiceMock;
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ISmsService> _smsServiceMock;
        private readonly Mock<IOtpService> _otpServiceMock;
        private readonly Mock<IEmailService> _emailServiceMock;
        private readonly Mock<IGoogleAuthService> _googleAuthServiceMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<ILogger<AuthService>> _loggerMock;

        private readonly AuthService _authService;

        public GetUserProfileAsyncTests()
        {
            _identityServiceMock = new Mock<IIdentityService>();
            _tokenServiceMock = new Mock<ITokenService>();
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _smsServiceMock = new Mock<ISmsService>();
            _otpServiceMock = new Mock<IOtpService>();
            _emailServiceMock = new Mock<IEmailService>();
            _googleAuthServiceMock = new Mock<IGoogleAuthService>();
            _cacheServiceMock = new Mock<ICacheService>();
            _loggerMock = new Mock<ILogger<AuthService>>();

            _authService = new AuthService(
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _unitOfWorkMock.Object,
                _smsServiceMock.Object,
                _otpServiceMock.Object,
                _emailServiceMock.Object,
                _googleAuthServiceMock.Object,
                _cacheServiceMock.Object,
                _loggerMock.Object
            );
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

            _identityServiceMock
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

            _identityServiceMock
                .Setup(x => x.GetUserProfileAsync(userId))
                .ReturnsAsync((UserProfileResponse?)null);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _authService.GetUserProfileAsync(userId));
        }
    }
}