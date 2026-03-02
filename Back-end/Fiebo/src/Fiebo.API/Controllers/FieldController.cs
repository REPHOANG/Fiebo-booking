using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTOs.Field;
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
            [FromQuery] int? sportTypeId,
            [FromQuery] double? radiusKm,
            [FromQuery] int limit = 5,
            [FromQuery] double userLat = 21.027381,
            [FromQuery] double userLng = 105.833529)
        {
            var result = await _venueService.GetNearbyVenues(sportTypeId, userLat, userLng, limit, radiusKm);
            return Ok(new ApiResponse<List<VenueInfoResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân gần nhất thành công",
                Data = [.. result]
            });
        }

        [HttpGet("top-booking")]
        public async Task<IActionResult> GetTopBookingVenues(
            [FromQuery] int limit = 5,
            [FromQuery] double userLat = 21.027381,
            [FromQuery] double userLng = 105.833529)
        {
            var result = await _venueService.GetTopBookingVenuesAsync(limit, userLat, userLng);
            return Ok(new ApiResponse<List<VenueInfoResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân nhiều lượt đặt nhất thành công",
                Data = [.. result]
            });
        }
    }
}
