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
                Message = "Đăng nhập thành công",
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
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = result.Message
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message,
            });
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
                return NotFound(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status404NotFound,
                    Message = "Không tìm thấy thông tin người dùng"
                });
            }
            return Ok(new ApiResponse<UserProfileServiceResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin người dùng thành công",
                Data = result
            });
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
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = result.Message
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message,
            });
        }
        /// <summary>
        /// Send email for reset password to the user with the specified email or phone number. The system will generate a password reset token and send it to the user's email or phone number
        /// </summary>
        /// <param name="request">Email or phone number associated with the user account for which to send the password reset notification. This can be either an email
        /// address or username. Cannot be null.</param>
        /// <returns>An IActionResult indicating the outcome of the operation. Returns 200 OK with the result if the password
        /// reset notification was sent successfully; otherwise, returns 400 Bad Request with error details.</returns>
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ResetPasswordDTO request)
        {
            if (string.IsNullOrEmpty(request.Account))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu."
                });
            }
            var result = await _authService.SendForgotPasswordAsync(request.Account);
            if (!result.IsSuccess)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = result.Message
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message
            });
        }
        /// <summary>
        /// Verifies the one-time password (OTP) provided for password reset and returns a reset token if the OTP is
        /// valid.
        /// </summary>
        /// <param name="request">The request containing the OTP and any additional information required for verification. Cannot be null.</param>
        /// <returns>An IActionResult containing a success response with a reset token if the OTP is valid; otherwise, a bad
        /// request response indicating the OTP is invalid or expired.</returns>
        [HttpPost("verify-reset-otp")]
        public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyResetOtpRequest request)
        {
            var resetToken = await _authService.VerifyResetOtpAsync(request);
            if (string.IsNullOrEmpty(resetToken))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Mã OTP không hợp lệ. Vui lòng thử lại."
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xác thực OTP thành công",
                Data = new 
                {
                    ResetToken = resetToken
                }
            });
        }

        /// <summary>
        /// Resets the user's password using the provided reset password request.
        /// </summary>
        /// <param name="request">An object containing the information required to reset the user's password, such as the reset token and new
        /// password. Cannot be null.</param>
        /// <returns>An IActionResult indicating the result of the password reset operation. Returns a 200 OK response if
        /// successful; otherwise, returns a 400 Bad Request with an error message.</returns>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] Application.DTOs.Auth.ResetPasswordRequest request)
        {

            var result = await _authService.ResetPasswordAsync(request);
            if (!result.IsSuccess)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = result.Message
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message
            });
        }
    }
}
