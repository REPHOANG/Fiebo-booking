using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;

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

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            var token = await _authService.GoogleLoginAsync(request);

            return Ok(new ApiResponse<string>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đăng nhập Google thành công",
                Data = token 
            });
        }

        /// <summary>
        /// Changes the password for the currently authenticated user.
        /// </summary>
        /// <remarks>This endpoint requires authentication. The user is identified by their email claim.
        /// Ensure that the request contains valid password data according to the application's password
        /// policy.</remarks>
        /// <param name="request">The request containing the current and new password information. Cannot be null.</param>
        /// <returns>An IActionResult indicating the result of the password change operation. Returns 200 OK if the password was
        /// changed successfully; otherwise, returns 400 Bad Request with error details.</returns>
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var result = await _authService.ChangePasswordAsync(userId, request);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        /// <summary>
        /// View the profile of the currently authenticated user.
        /// </summary>
        /// <returns></returns>
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var result = await _authService.GetUserProfileAsync(userId);
            if (result == null)
            {
                return NotFound(new { Message = "User profile not found." });
            }
            return Ok(result);
        }
        /// <summary>
        /// Updates the authenticated user's profile with the specified information.
        /// </summary>
        /// <param name="request">An object containing the updated profile information for the user. Cannot be null.</param>
        /// <returns>An IActionResult indicating the result of the update operation. Returns 200 OK with the result if
        /// successful; otherwise, returns 400 Bad Request with error details.</returns>
        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UserProfileRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var result = await _authService.UpdateUserProfileAsync(userId, request);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        /// <summary>
        /// Send email for reset password to the user with the specified email or phone number. The system will generate a password reset token and send it to the user's email or phone number
        /// </summary>
        /// <param name="account">Email or phone number associated with the user account for which to send the password reset notification. This can be either an email
        /// address or username. Cannot be null.</param>
        /// <returns>An IActionResult indicating the outcome of the operation. Returns 200 OK with the result if the password
        /// reset notification was sent successfully; otherwise, returns 400 Bad Request with error details.</returns>
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] string account)
        {
            if (string.IsNullOrEmpty(account))
            {
                return BadRequest(new { Message = "Account information is required." });
            }
            var result = await _authService.SendForgotPasswordAsync(account);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        /// <summary>
        /// Resets the user's password using the provided reset password request.
        /// </summary>
        /// <param name="userId"></param>
        /// <param name="token"></param>
        /// <param name="password"></param>
        /// <returns>An IActionResult indicating the outcome of the password reset operation. Returns a success response if the
        /// password was reset successfully; otherwise, returns a bad request response with error details.</returns>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromQuery] string userId,
            [FromQuery] string token,
            [FromBody] ResetPasswordDTO password)
        {
            token = WebUtility.UrlDecode(token);

            Console.WriteLine($"Decoded token: {token}");
            var req = new Application.DTOs.Auth.ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = password.NewPassword
            };
            var result = await _authService.ResetPasswordAsync(req);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}
