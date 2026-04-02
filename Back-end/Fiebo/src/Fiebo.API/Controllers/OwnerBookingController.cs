using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/owner/booking")]
    [ApiController]
    [Authorize(Roles = AppRoles.FieldOwner)]
    public class OwnerBookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public OwnerBookingController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetBookingDetail([FromRoute] int id)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Không thể xác định danh tính chủ sân.");
            }

            var result = await _bookingService.GetBookingDetailForOwnerAsync(id, ownerId);

            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status404NotFound,
                    Message = "Đơn hàng không tồn tại hoặc bạn không có quyền sở hữu đơn hàng này."
                });
            }

            return Ok(new ApiResponse<OwnerBookingDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải chi tiết đơn hàng thành công.",
                Data = result
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetBookingList([FromQuery] OwnerBookingFilter filter)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Không thể xác định danh tính chủ sân.");
            }

            var result = await _bookingService.GetBookingListForOwnerAsync(ownerId, filter);

            return Ok(new ApiResponse<PagedResult<OwnerBookingListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải danh sách đơn hàng thành công.",
                Data = result
            });
        }
    }
}