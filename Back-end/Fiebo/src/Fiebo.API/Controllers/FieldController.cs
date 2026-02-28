using Fiebo.API.Wrappers;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTO.Field;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FieldController : ControllerBase
    {
        private readonly IVenueService _venueService;

        public FieldController(IVenueService venueService)
        {
            _venueService = venueService;
        }
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyFields(
            [FromQuery] double userLat,
            [FromQuery] double userLng,
            [FromQuery] int? sportTypeId,
            [FromQuery] int amount)
        {
            var result = await _venueService.GetNearbyVenues(userLat, userLng,sportTypeId, amount);
            return Ok(new ApiResponse<List<NearbyFieldResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân gần nhất thành công",
                Data = [.. result]
            });
        }
    }
}
