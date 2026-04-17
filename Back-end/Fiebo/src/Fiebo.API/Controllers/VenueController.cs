using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.DTOs.Venue;
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
        private readonly ITimeSlotService _timeSlotService;

        public VenueController(
            IVenueService venueService,
            ILogger<VenueController> logger,
            IFieldService fieldService,
            ITimeSlotService timeSlotService
            )
        {
            _venueService = venueService;
            _logger = logger;
            _fieldService = fieldService;
            _timeSlotService = timeSlotService;
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
                    Message = "Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu."
                });
            }

            if (request.PageSize <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu."
                });
            }

            if (!request.Date.HasValue && request.Time.HasValue)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Ngày tìm kiếm không hợp lệ."
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

        [Authorize(Policy = "ActiveOwnerPlan")]
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

        [Authorize(Policy = "ActiveOwnerPlan")]
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

        [Authorize(Policy = "ActiveOwnerPlan")]
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
        [Authorize(Policy = "ActiveOwnerPlan")]
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


        /// <summary>
        /// UC-44: Change the status of a specific field (Active/Inactive).
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPatch]
        [Route("/api/owner/venue/{venueId}/fields/{fieldId}")]
        public async Task<IActionResult> ChangeFieldStatus(
            [FromRoute] int venueId,
            [FromRoute] int fieldId)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }
            await _fieldService.ChangeFieldStatusAsync(venueId, fieldId, ownerId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Vô hiệu hoá sân thành công"
            });
        }

        /// <summary>
        /// UC: Create a new field for a venue.
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("/api/owner/venues/{venueId}/fields")]
        public async Task<IActionResult> CreateField([FromRoute] int venueId, [FromForm] CreateFieldRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định người dùng.");
            }

            var fieldId = await _fieldService.CreateFieldAsync(venueId, request, userId);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo sân thành công.",
                Data = new { FieldId = fieldId }
            });
        }

        /// <summary>
        /// API for owner to create new venue.
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        /// <exception cref="UnauthorizedAccessException"></exception>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("/api/owner/venue/draft")]
        public async Task<IActionResult> CreateVenue([FromForm] CreateVenueRequest request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _venueService.CreateVenueAsync(request, ownerId);
            return Ok(new ApiResponse<CreateVenueResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo sân thành công",
                Data = result
            });
        }

        //[Authorize(Policy = "ActiveOwnerPlan")]
        //[HttpPatch("/api/owner/venue/{id}/draft")]
        //public async Task<IActionResult> CreateVenue([FromRoute] int id, [FromForm] CreateVenueRequest request)
        //{
        //    var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //    var result = await _venueService.EditVenueDraft(request, ownerId);
        //    return Ok(new ApiResponse<CreateVenueResponse>
        //    {
        //        StatusCode = StatusCodes.Status200OK,
        //        Message = "Tạo sân thành công",
        //        Data = result
        //    });
        //}

        /// <summary>
        /// Upload venue document images when create venue
        /// </summary>
        /// <param name="venueId"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        /// <exception cref="UnauthorizedAccessException"></exception>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("/api/owner/venues/{venueId}/documents")]
        public async Task<IActionResult> UploadVenueDocument([FromRoute] int venueId, [FromForm] CreateVenueDocumentRequest request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _venueService.UploadVenueDocumentAsync(venueId, ownerId, request);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải lên tài liệu sân thành công."
            });
        }

        /// <summary>
        /// Get the draft venue detail (for preview before submit) or view detail of draft venue
        /// </summary>
        /// <param name="venueId"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/venues/{venueId}/detail")]
        public async Task<IActionResult> GetVenueDraft([FromRoute] int venueId)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _venueService.GetOwnerVenueDetailAsync(venueId, ownerId);
            return Ok(new ApiResponse<OwnerVenueDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin sân nháp thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Submit drafted venue for approval.
        /// </summary>
        /// <param name="venueId"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPut("/api/owner/venues/{venueId}/submit")]
        public async Task<IActionResult> SubmitVenueDraft([FromRoute] int venueId)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _venueService.SubmitVenueDraftAsync(venueId, ownerId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Nộp duyệt sân thành công."
            });

        }

        /// <summary>
        /// Update field information for owner
        /// </summary>
        /// <param name="id"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPut("/api/owner/field/{id}")]
        public async Task<IActionResult> UpdateField(
            [FromRoute] int id,
            [FromForm] UpdateFieldRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _fieldService.UpdateFieldAsync(request, userId, id);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật thông tin sân thành công."
            });
        }

        /// <summary>
        /// Edit Venue Details: allows the Owner to update venue information.
        /// Status transitions are handled automatically via State Machine (BR-01, BR-02).
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPut("/api/owner/venues/{venueId}")]
        public async Task<IActionResult> UpdateVenue(
            [FromRoute] int venueId,
            [FromForm] UpdateVenueRequest request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Không thể xác định người dùng.");
            }

            await _venueService.UpdateVenueAsync(venueId, request, ownerId);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật cơ sở thành công."
            });
        }

        /// <summary>
        /// Field Owner adds a new service to a venue.
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("/api/owner/venue/{venueId}/service")]
        public async Task<IActionResult> AddVenueService(
            [FromRoute] int venueId,
            [FromForm] AddVenueServiceRequest request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId))
            {
                throw new UnauthorizedAccessException("Cannot identify current owner.");
            }

            var serviceId = await _venueService.AddVenueServiceAsync(venueId, ownerId, request);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Thêm dịch vụ thành công.",
                Data = new { ServiceId = serviceId }
            });
        }

        /// <summary>
        /// Field Owner edits an existing venue service.
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPut("/api/owner/service/{serviceId}")]
        public async Task<IActionResult> UpdateVenueService(
            [FromRoute] int serviceId,
            [FromForm] UpdateVenueServiceRequest request,
            CancellationToken cancellationToken)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId)) throw new UnauthorizedAccessException("Cannot identify current owner.");

            await _venueService.UpdateVenueServiceAsync(serviceId, ownerId, request, cancellationToken);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật dịch vụ thành công.",
            });
        }

        /// <summary>
        /// Field Owner deletes an existing venue service.
        /// </summary>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpDelete("/api/owner/service/{serviceId}")]
        public async Task<IActionResult> DeleteVenueService(
            [FromRoute] int serviceId,
            CancellationToken cancellationToken)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerId)) throw new UnauthorizedAccessException("Cannot identify current owner.");

            await _venueService.DeleteVenueServiceAsync(serviceId, ownerId, cancellationToken);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa dịch vụ thành công."
            });
        }

        /// <summary>
        /// Lấy danh sách dịch vụ của sân, có hỗ trợ phân trang, tìm kiếm và lọc.
        /// </summary>
        [HttpGet("/api/venue/{venueId}/services")]
        public async Task<IActionResult> GetVenueServices(
            [FromRoute] int venueId,
            [FromQuery] GetVenueServicesRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _venueService.GetVenueServicesAsync(venueId, request, cancellationToken);

            return Ok(new ApiResponse<PagedResult<VenueServiceDetailResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách dịch vụ thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Get time slots by venue and sport type for owner
        /// </summary>
        /// <param name="id"></param>
        /// <param name="sportTypeId"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/venue/{id}/time-slot")]
        public async Task<IActionResult> GetOwnerVenueSchedule(
            [FromRoute] int id, [FromQuery] int sportTypeId)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _timeSlotService.GetVenueTimeSlotAsync(id, sportTypeId, ownerId);
            return Ok(new ApiResponse<VenueTimeSlotResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy lịch sân thành công",
                Data = result
            });
        }

        /// <summary>
        /// Create time slots for a venue by sport type
        /// </summary>
        /// <param name="id"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("/api/owner/venue/{id}/time-slot")]
        public async Task<IActionResult> CreateVenueTimeSlot(
            [FromRoute] int id,
            [FromBody] List<CreateVenueTimeSlotRequest> request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _timeSlotService.CreateVenueTimeSlotAsync(id, request, ownerId);
            return Ok(new ApiResponse<List<VenueTimeSlotDto>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo khung giờ sân thành công",
                Data = result
            });
        }

        /// <summary>
        /// Soft detele and create a new slot to replace
        /// </summary>
        /// <param name="id"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPut("/api/owner/time-slots/{id}")]
        public async Task<IActionResult> UpdateVenueTimeSlot(
            [FromRoute] int id,
            [FromBody] UpdateVenueTimeSlotRequest request)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _timeSlotService.UpdateVenueTimeSlotAsync(id, request, ownerId);
            return Ok(new ApiResponse<VenueTimeSlotDto>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật khung giờ sân thành công",
                Data = result
            });
        }

        /// <summary>
        /// Soft delete the time slot for owner
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpDelete("/api/owner/time-slots/{id}")]
        public async Task<IActionResult> DeleteVenueTimeSlot(
            [FromRoute] int id)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _timeSlotService.DeleteVenueTimeSlotAsync(id, ownerId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa khung giờ sân thành công"
            });
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/field/{id}")]
        public async Task<IActionResult> GetOwnerFieldDetail([FromRoute] int id)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _fieldService.GetOwnerFieldDetailAsync(id, ownerId);
            return Ok(new ApiResponse<OwnerFieldDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin sân thành công",
                Data = result
            });
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/venue/select-option")]
        public async Task<IActionResult> GetOwnerVenueSelectOption()
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _venueService.GetOwnerVenueSelectOptionAsync(ownerId);
            return Ok(new ApiResponse<List<OwnerVenueSelectOptionResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách cơ sở thành công",
                Data = [.. result]
            });
        }
    }
}
