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
        // otp verification: unnecessary for now
        #region
        //[HttpPost("send-otp")]
        //public async Task<IActionResult> SendBookingOtp([FromBody] BookingOtpRequest request)
        //{
        //    var result = await _bookingService.SendBookingVerifyOtp(request.PhoneNumber);
        //    if (!result.IsSuccess)
        //    {
        //        return BadRequest(new ApiResponse<object>
        //        {
        //            StatusCode = StatusCodes.Status400BadRequest,
        //            Message = "Gửi mã OTP thất bại."
        //        });
        //    }
        //    return Ok(new ApiResponse<object>
        //    {
        //        StatusCode = StatusCodes.Status200OK,
        //        Message = result.Message
        //    });
        //}
        //[HttpPost("verify-otp")]
        //public async Task<IActionResult> VerifyBookingOtp([FromBody] VerifyBookingOtpRequest request)
        //{
        //    var result = await _bookingService.VerifyBookingOtp(request.Fullname, request.PhoneNumber, request.OtpCode);
        //    return Ok(new ApiResponse<object>
        //    {
        //        StatusCode = StatusCodes.Status200OK,
        //        Message = "Xác thực OTP thành công.",
        //        Data = new
        //        {
        //            AccessToken = result
        //        }
        //    });
        //}
        #endregion

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
