using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
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
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
            var bookings = await _staffService.GetStaffBookingsAsync(staffId, param);
            return Ok(new ApiResponse<PagedResult<OwnerBookingListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách đặt sân thành công",
                Data = bookings
            });
        }
    }
}
