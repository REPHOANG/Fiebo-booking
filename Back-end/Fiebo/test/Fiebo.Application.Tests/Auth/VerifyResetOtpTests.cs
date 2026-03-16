using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Moq;
using Moq.AutoMock;
using Xunit;

public class VerifyResetOtpTests
{
    private readonly AutoMocker _mocker;
    private readonly AuthService _authService;

    public VerifyResetOtpTests()
    {
        _mocker = new AutoMocker();
        _authService = _mocker.CreateInstance<AuthService>();
    }

    [Fact]
    public async Task Should_ReturnToken_WhenOtpValid()
    {
        var request = new VerifyResetOtpRequest
        {
            Account = "test@gmail.com",
            OtpCode = "123456"
        };

        _mocker.GetMock<IOtpService>()
            .Setup(x => x.ValidateResetOtpAsync(request.Account, request.OtpCode))
            .ReturnsAsync("reset_token_123");

        var result = await _authService.VerifyResetOtpAsync(request);

        Assert.Equal("reset_token_123", result);
    }
}