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

        /// <summary>
        /// Retrieves the booking details for the specified booking identifier belonging to the authenticated customer.
        /// </summary>
        /// <remarks>This method is accessible only to users in the Customer role. The booking must belong
        /// to the authenticated user; otherwise, an error response is returned.</remarks>
        /// <param name="id">The unique identifier of the booking to retrieve. Must be a valid booking ID associated with the current
        /// user.</param>
        /// <returns>An <see cref="IActionResult"/> containing an <see cref="ApiResponse{BookingDetailResponse}"/> with the
        /// booking details if found; otherwise, an appropriate error response.</returns>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingById([FromRoute] int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var result = await _bookingService.GetBookingDetailAsync(id, userId);
            return Ok(new ApiResponse<BookingDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Booking retrieved successfully.",
                Data = result
            });
        }

        /// <summary>
        /// Retrieves the booking history for the authenticated customer.
        /// </summary>
        /// <returns>A list of booking history records wrapped in an ApiResponse.</returns>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpGet("history")]
        public async Task<IActionResult> GetBookingHistory()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Cannot identify current user.");
            }

            var result = await _bookingService.GetBookingHistoryAsync(userId);
            return Ok(new ApiResponse<List<BookingHistoryResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải lịch sử đặt sân thành công.",
                Data = result
            });
        }
    }
}
