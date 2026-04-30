using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = AppRoles.FieldStaff)]
    [ApiController]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;
        public StaffController(IStaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpGet("venues")]
        public async Task<IActionResult> GetAssignedVenues()
        {
            var staffId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var venues = await _staffService.GetAssignedVenuesAsync(staffId);
            return Ok(new ApiResponse<List<OwnerVenueListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân bóng thành công",
                Data = venues
            });
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetStaffBookings([FromQuery] OwnerBookingHistoryFilter param)
        {
            var staffId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var bookings = await _staffService.GetStaffBookingsAsync(staffId, param);
            return Ok(new ApiResponse<PagedResult<OwnerBookingListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách đặt sân thành công",
                Data = bookings
            });
        }

        [HttpGet("booking/{id}")]
        public async Task<IActionResult> GetBookingDetail([FromRoute] int id)
        {
            var staffId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var booking = await _staffService.GetBookingDetailAsync(staffId, id);
            return Ok(new ApiResponse<OwnerBookingDetailResponse>
            {
                StatusCode= StatusCodes.Status200OK,
                Message = "Lấy thông tin đơn đặt sân thành công",
                Data = booking
            });
        }

        [HttpGet("events")]
        public async Task<IActionResult> GetStaffEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var staffId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var events = await _staffService.GetStaffEventsAsync(staffId, page, pageSize);
            return Ok(new ApiResponse<PagedResult<OwnerDropInEventListItemResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sự kiện thành công",
                Data = events
            });
        }

        [HttpGet("event/{id}")]
        public async Task<IActionResult> GetEventDetails([FromRoute] int id)
        {
            var staffId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var eventDetails = await _staffService.GetEventDetailsAsync(staffId, id);
            return Ok(new ApiResponse<OwnerTicketEventDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy chi tiết sự kiện thành công",
                Data = eventDetails
            });
        }
    }
}
