using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OwnerController : ControllerBase
    {
        private readonly IEventService _eventService;

        public OwnerController(IEventService eventService)
        {
            _eventService = eventService;
        }

        /// <summary>
        /// UC-62: Create a new drop-in event for a specific field.
        /// </summary>
        [Authorize(Roles = AppRoles.FieldOwner + "," + AppRoles.FieldStaff)]
        [HttpPost("event")]
        public async Task<IActionResult> CreateDropInEvent([FromBody] CreateDropInEventRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Cannot identify current user.");
            }

            var eventId = await _eventService.CreateDropInEventAsync(request, userId);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo sự kiện thành công.",
                Data = new { EventId = eventId }
            });
        }

        /// <summary>
        /// Get detailed info of a drop-in event for the Owner (including player list).
        /// </summary>
        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpGet("event/{id:int}")]
        public async Task<IActionResult> GetOwnerEventDetail([FromRoute] int id)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }

            var result = await _eventService.GetEventDetailForOwnerAsync(id, ownerId);

            return Ok(new ApiResponse<OwnerTicketEventDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải chi tiết sự kiện cho chủ sân thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Update drop-in event details. 
        /// Only allowed if NO participants have joined.
        /// </summary>
        //[Authorize(Roles = AppRoles.FieldOwner)]
        //[HttpPut("event/{id:int}")]
        //public async Task<IActionResult> UpdateOwnerEvent([FromRoute] int id, [FromBody] UpdateDropInEventRequest request)
        //{
        //    var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        //    try
        //    {
        //        await _eventService.UpdateDropInEventAsync(id, request, ownerId!);

        //        return Ok(new ApiResponse<object>
        //        {
        //            StatusCode = StatusCodes.Status200OK,
        //            Message = "Cập nhật thông tin sự kiện thành công."
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        // Trả về lỗi nếu có người đăng ký (Logic ở Service ném ra)
        //        return BadRequest(new ApiResponse<object>
        //        {
        //            StatusCode = StatusCodes.Status400BadRequest,
        //            Message = ex.Message
        //        });
        //    }
        //}

        /// <summary>
        /// Edit drop-in event by event id when there is no player join the event. Only field owner can perform this action.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpPut("event/{id}")]
        public async Task<IActionResult> UpdateEvent([FromRoute] int id, [FromBody] UpdateEventRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _eventService.UpdateDropInEventAsync(id, request, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật sự kiện thành công.",
            });
        }
    }
}
