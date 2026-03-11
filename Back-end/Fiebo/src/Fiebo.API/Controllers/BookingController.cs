using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        /// <summary>
        /// Complete booking payment using the customer's wallet.
        /// </summary>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("{bookingId:int}/payment")]
        public async Task<IActionResult> MakeBookingPayment([FromRoute] int bookingId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Cannot identify current user.");
            }

            var result = await _bookingService.MakeBookingPaymentAsync(bookingId, userId);

            return Ok(new ApiResponse<BookingPaymentResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Booking payment completed successfully using system wallet.",
                Data = result
            });
        }

        /// <summary>
        /// Sends a booking verification OTP to the phone number specified in the request.
        /// </summary>
        /// <param name="request">The booking OTP request containing the phone number to which the OTP will be sent. Cannot be null.</param>
        /// <returns>An IActionResult containing the result of the OTP send operation. Returns a 200 OK response if successful;
        /// otherwise, returns a 400 Bad Request response with an error message.</returns>
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendBookingOtp([FromBody] BookingOtpRequest request)
        {
            var result = await _bookingService.SendBookingVerifyOtp(request.PhoneNumber);
            if (!result.IsSuccess)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Gửi mã OTP thất bại."
                });
            }
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message
            });
        }

        /// <summary>
        /// Verifies the OTP code for a booking request and returns an access token if the verification is successful.
        /// </summary>
        /// <remarks>This method is typically used during the booking process to confirm user identity via
        /// OTP. The access token returned can be used for subsequent authenticated requests. If the OTP verification
        /// fails, an error response is returned.</remarks>
        /// <param name="request">The booking OTP verification request containing the user's full name, phone number, and OTP code. Cannot be
        /// null.</param>
        /// <returns>An HTTP 200 OK response containing an access token if the OTP verification succeeds.</returns>
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyBookingOtp([FromBody] VerifyBookingOtpRequest request)
        {
            var result = await _bookingService.VerifyBookingOtp(request.Fullname, request.PhoneNumber, request.OtpCode);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xác thực OTP thành công.",
                Data = new
                {
                    AccessToken = result
                }
            });
        }

        /// <summary>
        /// Hold slots for booking — check availability, lock slots, and create a Pending booking.
        /// Returns bookingId and expiredAt for payment countdown.
        /// </summary>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost]
        public async Task<IActionResult> CreateBooking(CreateBookingRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var result = await _bookingService.CreateBookingAsync(request, userId);

            return Ok(new ApiResponse<HoldSlotResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đặt sân thành công. Vui lòng thanh toán trước thời hạn.",
                Data = result
            });
        }
    }
}
