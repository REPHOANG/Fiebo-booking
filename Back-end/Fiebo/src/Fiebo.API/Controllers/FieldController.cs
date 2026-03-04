using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
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

        /// <summary>
        /// Search fields by location, date, time and sport type
        /// but return matched venues.
        /// </summary>
        /// <param name="location">Keyword for venue/province/ward/address.</param>
        /// <param name="date">Booking date (yyyy-MM-dd).</param>
        /// <param name="time">Booking time (HH:mm:ss), optional if date is provided.</param>
        /// <param name="sportTypeId"></param>
        /// <param name="limit"></param>
        /// <param name="radiusKm"></param>
        /// <param name="userLat"></param>
        /// <param name="userLng"></param>
        /// <returns></returns>
        [HttpGet("search")]
        public async Task<IActionResult> SearchFields(
            [FromQuery] string? location,
            [FromQuery] DateOnly? date,
            [FromQuery] TimeSpan? time,
            [FromQuery] int? sportTypeId,
            [FromQuery] int limit = 10,
            [FromQuery] double? radiusKm = null,
            [FromQuery] double userLat = 21.027381,
            [FromQuery] double userLng = 105.833529)
        {
            if (limit <= 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "limit phải lớn hơn 0"
                });
            }

            if (!date.HasValue && time.HasValue)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Không thể chỉ truyền time, hãy truyền kèm date"
                });
            }

            var result = await _venueService.SearchVenuesByFieldAsync(
                location,
                date,
                time,
                sportTypeId,
                userLat,
                userLng,
                limit,
                radiusKm);

            return Ok(new ApiResponse<List<VenueInfoResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tìm kiếm sân theo điều kiện thành công",
                Data = [.. result]
            });
        }
    }
}
