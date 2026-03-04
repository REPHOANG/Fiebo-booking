using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;
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

        /// <summary>
        /// Get nearby fields by user location, default location (HaNoi) if user does not allow location.
        /// </summary>
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
                Message = "Get nearby venues successfully",
                Data = [.. result]
            });
        }

        /// <summary>
        /// Get top booking fields.
        /// </summary>
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
                Message = "Get top booking venues successfully",
                Data = [.. result]
            });
        }

        /// <summary>
        /// Search fields by location, date, time and sport type, but return matched venues.
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchFields(
            [FromQuery] string? location,
            [FromQuery] DateOnly? date,
            [FromQuery] TimeSpan? time,
            [FromQuery] int? sportTypeId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] double? radiusKm = null,
            [FromQuery] double userLat = 21.027381,
            [FromQuery] double userLng = 105.833529)
        {
            if (page <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "page must be greater than 0"
                });
            }

            if (pageSize <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "pageSize must be greater than 0"
                });
            }

            if (!date.HasValue && time.HasValue)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "time cannot be provided without date"
                });
            }

            var result = await _venueService.SearchVenuesByFieldAsync(
                location,
                date,
                time,
                sportTypeId,
                userLat,
                userLng,
                page,
                pageSize,
                radiusKm);

            return Ok(new ApiResponse<PagedResult<VenueInfoResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Search venues successfully",
                Data = result
            });
        }
    }
}
