using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Shared;
using Fiebo.Domain.DTOs.Field;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VenueController : ControllerBase
    {
        private readonly IVenueService _venueService;
        private readonly ILogger<VenueController> _logger;
        private readonly IFieldService _fieldService;

        public VenueController(
            IVenueService venueService,
            ILogger<VenueController> logger,
            IFieldService fieldService
            )
        {
            _venueService = venueService;
            _logger = logger;
            _fieldService = fieldService;
        }

        /// <summary>
        /// Get nearby fields by user location, default location (HaNoi) if user does not allow location.
        /// </summary>
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyFields(
            [FromQuery] int? sportTypeId,
            [FromQuery] double radiusKm = 50,
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

        [HttpGet("{id}/details")]
        public async Task<IActionResult> GetVenueDetail([FromRoute] int id)
        {
            var result = await _venueService.GetVenueDetail(id);
            return Ok(new ApiResponse<VenueDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin sân thành công",
                Data = result
            });
        }

        [HttpGet("{id}/fields")]
        public async Task<IActionResult> GetFieldsByVenue(
            [FromRoute] int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _fieldService.GetFieldsByVenue(id, page, pageSize);
            return Ok(new ApiResponse<PagedResult<FieldsDetailDTO>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân thành công",
                Data = result
            });
        }

        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviewsByVenue(
            [FromRoute] int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sort = null)
        {
            var result = await _venueService.GetReviewsByVenue(id, page, pageSize, sort);
            return Ok(new ApiResponse<PagedResult<ReviewDTO>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách đánh giá thành công",
                Data = result
            });

        }
    }
}
