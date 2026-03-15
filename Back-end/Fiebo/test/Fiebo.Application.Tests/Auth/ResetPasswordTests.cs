using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Moq;
using Moq.AutoMock;

public class ResetPasswordTests
{
    private readonly AutoMocker _mocker;
    private readonly AuthService _authService;

    public ResetPasswordTests()
    {
        _mocker = new AutoMocker();
        _authService = _mocker.CreateInstance<AuthService>();
    }

    [Fact]
    public async Task Should_ReturnFail_WhenTokenInvalid()
    {
        var request = new ResetPasswordRequest
        {
            ResetToken = "invalid",
            NewPassword = "123456"
        };

        _mocker.GetMock<ICacheService>()
            .Setup(x => x.GetAsync("reset_token:invalid"))
            .ReturnsAsync((string?)null);

        var result = await _authService.ResetPasswordAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal("Token không hợp lệ hoặc đã hết hạn!", result.Message);
    }

    [Fact]
    public async Task Should_ReturnFail_WhenIdentityResetFail()
    {
        var request = new ResetPasswordRequest
        {
            ResetToken = "token1",
            NewPassword = "123456"
        };

        _mocker.GetMock<ICacheService>()
            .Setup(x => x.GetAsync("reset_token:token1"))
            .ReturnsAsync("test@gmail.com");

        _mocker.GetMock<IIdentityService>()
            .Setup(x => x.ResetPasswordAsync("test@gmail.com", request.NewPassword))
            .ReturnsAsync(new ServiceResponse
            {
                IsSuccess = false,
                Message = "Password weak"
            });

        var result = await _authService.ResetPasswordAsync(request);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_ResetPassword_WhenSuccess()
    {
        var request = new ResetPasswordRequest
        {
            ResetToken = "token1",
            NewPassword = "123456"
        };

        _mocker.GetMock<ICacheService>()
            .Setup(x => x.GetAsync("reset_token:token1"))
            .ReturnsAsync("test@gmail.com");

        _mocker.GetMock<IIdentityService>()
            .Setup(x => x.ResetPasswordAsync("test@gmail.com", request.NewPassword))
            .ReturnsAsync(new ServiceResponse
            {
                IsSuccess = true,
                Message = "Đặt lại mật khẩu thành công"
            });

        var result = await _authService.ResetPasswordAsync(request);

        Assert.True(result.IsSuccess);

        _mocker.GetMock<ICacheService>()
            .Verify(x => x.RemoveAsync("reset_token:token1"), Times.Once);
    }
}