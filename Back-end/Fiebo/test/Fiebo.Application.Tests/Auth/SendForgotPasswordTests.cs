using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Moq;
using Moq.AutoMock;
using Xunit;

namespace Fiebo.Application.Tests.Auth
{
    public class SendForgotPasswordTests
    {
        private readonly AutoMocker _mocker;
        private readonly AuthService _authService;

        public SendForgotPasswordTests()
        {
            _mocker = new AutoMocker();
            _authService = _mocker.CreateInstance<AuthService>();
        }

        [Fact]
        public async Task Should_ReturnFail_WhenAccountNotFound()
        {
            // Arrange
            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("test@gmail.com"))
                .ReturnsAsync((UserProfileResponse?)null);

            // Act
            var result = await _authService.SendForgotPasswordAsync("test@gmail.com");

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Equal("Email hoặc SĐT không tồn tại!", result.Message);
        }

        [Fact]
        public async Task Should_SendEmail_WhenAccountIsEmail()
        {
            // Arrange
            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("test@gmail.com"))
                .ReturnsAsync(new UserProfileResponse());

            _mocker.GetMock<IOtpService>()
                .Setup(x => x.GenerateAndStoreResetOtpAsync("test@gmail.com"))
                .ReturnsAsync(("123456", 5));

            // Act
            var result = await _authService.SendForgotPasswordAsync("test@gmail.com");

            // Assert
            Assert.True(result.IsSuccess);

            _mocker.GetMock<IEmailService>()
                .Verify(x => x.SendEmailAsync(
                    "test@gmail.com",
                    It.IsAny<string>(),
                    It.IsAny<string>()),
                    Times.Once);
        }

        [Fact]
        public async Task Should_SendSms_WhenAccountIsPhone()
        {
            // Arrange
            _mocker.GetMock<IIdentityService>()
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("0901234567"))
                .ReturnsAsync(new UserProfileResponse());

            _mocker.GetMock<IOtpService>()
                .Setup(x => x.GenerateAndStoreResetOtpAsync("0901234567"))
                .ReturnsAsync(("123456", 5));

            _mocker.GetMock<ISmsService>()
                .Setup(x => x.SendSmsAsync("0901234567", It.IsAny<string>()))
                .ReturnsAsync(new ServiceResponse { IsSuccess = true });

            // Act
            var result = await _authService.SendForgotPasswordAsync("0901234567");

            // Assert
            Assert.True(result.IsSuccess);

            _mocker.GetMock<ISmsService>()
                .Verify(x => x.SendSmsAsync("0901234567", It.IsAny<string>()),
                Times.Once);
        }
    }
}