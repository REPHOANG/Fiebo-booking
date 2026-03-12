using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Tests.Auth
{
    public class SendForgotPasswordTests
    {
        private readonly Mock<IIdentityService> _identityService = new();
        private readonly Mock<IOtpService> _otpService = new();
        private readonly Mock<IEmailService> _emailService = new();
        private readonly Mock<ISmsService> _smsService = new();
        private readonly Mock<ICacheService> _cacheService = new();
        private readonly Mock<ILogger<AuthService>> _logger = new();

        private AuthService CreateService()
        {
            return new AuthService(
                _identityService.Object,
                _otpService.Object,
                _emailService.Object,
                _smsService.Object,
                _cacheService.Object,
                _logger.Object);
        }

        [Fact]
        public async Task Should_ReturnFail_WhenAccountNotFound()
        {
            var service = CreateService();

            _identityService
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("test@gmail.com"))
                .ReturnsAsync((UserProfileResponse?)null);

            var result = await service.SendForgotPasswordAsync("test@gmail.com");

            Assert.False(result.IsSuccess);
            Assert.Equal("Email hoặc SĐT không tồn tại!", result.Message);
        }

        [Fact]
        public async Task Should_SendEmail_WhenAccountIsEmail()
        {
            var service = CreateService();

            _identityService
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("test@gmail.com"))
                .ReturnsAsync(new UserProfileResponse());

            _otpService
                .Setup(x => x.GenerateAndStoreResetOtpAsync("test@gmail.com"))
                .ReturnsAsync((OtpCode: "123456", ExpireMinutes: 5));

            var result = await service.SendForgotPasswordAsync("test@gmail.com");

            Assert.True(result.IsSuccess);

            _emailService.Verify(
                x => x.SendEmailAsync(
                    "test@gmail.com",
                    It.IsAny<string>(),
                    It.IsAny<string>()),
                Times.Once);
        }

        [Fact]
        public async Task Should_SendSms_WhenAccountIsPhone()
        {
            var service = CreateService();

            _identityService
                .Setup(x => x.GetUserProfileByEmailOrPhoneAsync("0901234567"))
                .ReturnsAsync(new UserProfileResponse());

            _otpService
                .Setup(x => x.GenerateAndStoreResetOtpAsync("0901234567"))
                .ReturnsAsync((OtpCode: "123456", ExpireMinutes: 5));

            _smsService
                .Setup(x => x.SendSmsAsync("0901234567", It.IsAny<string>()))
                .ReturnsAsync(new ServiceResponse { IsSuccess = true });

            var result = await service.SendForgotPasswordAsync("0901234567");

            Assert.True(result.IsSuccess);

            _smsService.Verify(
                x => x.SendSmsAsync("0901234567", It.IsAny<string>()),
                Times.Once);
        }
    }
}
