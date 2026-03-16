using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Event;
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

        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinDropInEvent([FromRoute] int id, [FromBody] JoinEventRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _eventService.JoinDropInEventAsync(request, id, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tham gia đặt sân thành công.",
            });
        }

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
    }
}
