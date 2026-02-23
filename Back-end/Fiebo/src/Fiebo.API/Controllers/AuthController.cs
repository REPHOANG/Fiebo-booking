using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegistrationRequest request)
        {
            var message = await _authService.RegisterAsync(request);

            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = message
            });
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var message = await _authService.VerifyEmailAsync(request);

            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = message
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Application.DTOs.Auth.LoginRequest request)
        {
            var token = await _authService.LoginAsync(request);

            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đăng nhập thành công",
                Data = token
            });
        }
    }
}
