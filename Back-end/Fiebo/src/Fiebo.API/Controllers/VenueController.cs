using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
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
        /// Retrieves detailed information about a specific venue by its id.
        /// </summary>
        /// <param name="id">The unique identifier of the venue to retrieve details for. Must be a valid venue ID.</param>
        /// <returns>An IActionResult containing the venue details if found; otherwise, a response indicating the venue was not
        /// found.</returns>
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

        /// <summary>
        /// Retrieves a paginated list of field details for the specified venue.
        /// </summary>
        /// <param name="id">The id of the venue for which to retrieve field details.</param>
        /// <param name="page">The page number of results to return. Must be greater than zero.</param>
        /// <param name="pageSize">The number of field records to include per page. Must be greater than zero.</param>
        /// <returns>An IActionResult containing an ApiResponse with a paged result of field details for the specified venue.</returns>
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

        /// <summary>
        /// Retrieves a paginated list of reviews for the specified venue.
        /// </summary>
        /// <remarks>The returned result includes status information and a message indicating the success
        /// of the operation. Pagination parameters allow efficient retrieval of large review sets.</remarks>
        /// <param name="id">The id of the venue for which to retrieve reviews.</param>
        /// <param name="page">The page number of results to return. Must be greater than zero. Defaults to 1.</param>
        /// <param name="pageSize">The number of reviews to include per page. Must be greater than zero. Defaults to 10.</param>
        /// <param name="sort">An optional sort expression to order the reviews. If null, the default sorting is applied.</param>
        /// <returns>An IActionResult containing an ApiResponse with a paged result of review data for the specified venue.</returns>
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

        [HttpGet("{id}/schedule")]
        public async Task<IActionResult> GetVenueSchedule(
            [FromRoute] int id,
            [FromQuery] DateOnly date)
        {
            var result = await _venueService.GetVenueSchedule(id, date);
            return Ok(new ApiResponse<VenueSlotsResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy lịch sân thành công",
                Data = result
            });
        }

        /// <summary>
        /// Search fields by location, date, time and sport type, but return matched venues.
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchFields(
            [FromQuery] SearchFieldsRequest request)
        {
            if (request.Page <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "page must be greater than 0"
                });
            }

            if (request.PageSize <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "pageSize must be greater than 0"
                });
            }

            if (!request.Date.HasValue && request.Time.HasValue)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "time cannot be provided without date"
                });
            }

            var result = await _venueService.SearchVenuesByFieldAsync(request);

            return Ok(new ApiResponse<PagedResult<VenueInfoResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Search venues successfully",
                Data = result
            });
        }

        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpGet]
        [Route("/api/owner/venues")]
        public async Task<IActionResult> GetOwnerVenues()
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }
            var result = await _venueService.GetVenuesByOwnerAsync(ownerId);
            return Ok(new ApiResponse<List<OwnerVenueListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Get owner's venues successfully",
                Data = [.. result]
            });
        }

        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpPatch]
        [Route("/api/owner/venues/{id}")]
        public async Task<IActionResult> DeactivateVenue([FromRoute] int id)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }
            await _venueService.DeactivateVenueAsync(id, ownerId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Vô hiệu hoá sân thành công"
            });
        }

        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpGet]
        [Route("/api/owner/venue/{id}/schedule")]
        public async Task<IActionResult> GetOwnerVenueSchedule([FromRoute] int id, [FromQuery] DateOnly date)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }
            var result = await _venueService.GetOwnerVenueScheduleAsync(id, ownerId, date);
            return Ok(new ApiResponse<VenueSlotsResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy lịch sân thành công",
                Data = result
            });
        }

        /// <summary>
        /// UC-41: Get all fields under a specific venue for the Field Owner.
        /// </summary>
        [Authorize(Roles = AppRoles.FieldOwner)]
        [HttpGet]
        [Route("/api/owner/venue/{venueId}/fields")]
        public async Task<IActionResult> GetOwnerFieldsByVenue([FromRoute] int venueId)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }

            var result = await _fieldService.GetOwnerFieldsByVenueAsync(venueId, ownerId);

            if (result.Count == 0)
            {
                return Ok(new ApiResponse<List<OwnerFieldListItemResponse>>
                {
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Chưa có sân nào được tạo trong cơ sở này.",
                    Data = result
                });
            }

            return Ok(new ApiResponse<List<OwnerFieldListItemResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách sân thành công.",
                Data = result
            });
        }
    }
}
