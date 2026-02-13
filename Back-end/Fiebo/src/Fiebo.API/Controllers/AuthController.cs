using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.DTOs.Common;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Http;
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
        public async Task<IActionResult> Register(RegisterDTO request)
        {
            await _authService.Register(request);
            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Registration successful. Please check your email for the OTP code to verify your account."
,
            });
        }

        [HttpPost("activate")]
        public async Task<IActionResult> Activate(VerifyOtpDTO request)
        {
            await _authService.Activate(request);
            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Account activated successfully!",
            });
        }
    }
}
