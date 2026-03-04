using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
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
        /// Get nearby fields by user location, default location (HaNoi) if user does not allow to location
        /// </summary>
        /// <param name="sportTypeId"></param>
        /// <param name="radiusKm"></param>
        /// <param name="limit"></param>
        /// <param name="userLat"></param>
        /// <param name="userLng"></param>
        /// <returns></returns>
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
                Message = "Lấy danh sách sân gần nhất thành công",
                Data = [.. result]
            });
        }

        /// <summary>
        /// Get top booking fields
        /// </summary>
        /// <param name="limit"></param>
        /// <param name="userLat"></param>
        /// <param name="userLng"></param>
        /// <returns></returns>
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
