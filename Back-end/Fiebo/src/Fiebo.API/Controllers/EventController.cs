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
    public class EventController : ControllerBase
    {
        private readonly IEventService _eventService;

        public EventController(IEventService eventService)
        {
            _eventService = eventService;
        }

        

        /// <summary>
        /// Get list of available drop-in events (Pending status).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetDropInEventList()
        {
            var events = await _eventService.GetDropInEventListAsync();
            return Ok(new ApiResponse<List<DropInEventListItemResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = events.Count > 0
                    ? "Lấy danh sách sự kiện thành công."
                    : "Sân hiện chưa có sự kiện.",
                Data = events
            });
        }

        /// <summary>
        /// Join drop in event
        /// </summary>
        /// <param name="id"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinDropInEvent([FromRoute] int id, [FromBody] JoinEventRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var ticketId = await _eventService.JoinDropInEventAsync(request, id, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tham gia đặt sân thành công.",
                Data = new
                {
                    TicketParticipantId = ticketId
                }
            });
        }

        /// <summary>
        /// Get the ticket detail of a drop-in event. 
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpGet("ticket/{id}")]
        public async Task<IActionResult> GetTicketDetail([FromRoute] int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            var ticketDetail = await _eventService.GetTicketDetailAsync(id, userId);
            return Ok(new ApiResponse<TicketDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin vé thành công.",
                Data = ticketDetail
            });
        }

        /// <summary>
        /// Get drop-in event detail by event id.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDropInEventDetail([FromRoute] int id)
        {
            var dropInEvent = await _eventService.GetDropInEventDetailAsync(id);
            return Ok(new ApiResponse<TicketEventDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin sự kiện thành công.",
                Data = dropInEvent
            });
        }

        /// <summary>
        /// Make payment for a drop-in event ticket by ticket id.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("ticket/{id}/payment")]
        public async Task<IActionResult> MakeDropInPayment([FromRoute] int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _eventService.MakeDropInPayment(id, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Thanh toán thành công.",
            });
        }

        /// <summary>
        /// Get drop-in event list for the current owner.
        /// </summary>
        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpGet]
        [Route("/api/owner/events")]
        public async Task<IActionResult> GetOwnerEventList()
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Không thể xác định danh tính chủ sân.");
            }

            var events = await _eventService.GetOwnerEventListAsync(ownerId);

            return Ok(new ApiResponse<List<OwnerDropInEventListItemResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải danh sách sự kiện thành công.",
                Data = events
            });
        }

        /// <summary>
        /// UC-62: Create a new drop-in event for a specific field.
        /// </summary>
        [Authorize(Roles = AppRoles.FieldOwner + "," + AppRoles.FieldStaff)]
        [HttpPost("/api/owner/event")]
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
        [HttpGet("/api/owner/event/{id:int}")]
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
        [HttpPut("/api/owner/event/{id}")]
        public async Task<IActionResult> UpdateEvent([FromRoute] int id, [FromBody] UpdateEventRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _eventService.UpdateDropInEventAsync(id, request, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Chỉnh sửa sự kiện thành công.",
            });
        }
    }
}
