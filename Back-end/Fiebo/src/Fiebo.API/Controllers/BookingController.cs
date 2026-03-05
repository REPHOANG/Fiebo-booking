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
    }
}
