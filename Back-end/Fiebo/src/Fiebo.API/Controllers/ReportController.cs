using Fiebo.Application.DTOs.Report;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Authorize] // Bắt buộc đăng nhập
    [Route("api/[controller]")]
    [ApiController] // Đánh dấu đây là Web API Controller
    public class ReportController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportController(IReportService reportService)
        {
            _reportService = reportService;
        }

        /// <summary>
        /// Customer gửi báo cáo cho một Booking (Yêu cầu Booking Status = 1)
        /// </summary>
        [Authorize(Roles = "Customer")] 
        [HttpPost("send-booking-report")]
        public async Task<IActionResult> SendReport([FromBody] CreateReportRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Không tìm thấy thông tin người dùng.");
            }

            var result = await _reportService.SendReportAsync(userId, request);

            if (result)
            {
                return Ok(new
                {
                    StatusCode = 200,
                    Message = "Báo cáo của bạn đã được gửi thành công và đang chờ xử lý."
                });
            }

            return BadRequest(new
            {
                StatusCode = 400,
                Message = "Gửi báo cáo thất bại. Vui lòng kiểm tra lại thông tin."
            });
        }

        /// <summary>
        /// Admin phản hồi báo cáo của khách hàng
        /// </summary>
        [Authorize(Roles = "Admin")] 
        [HttpPatch("admin-respond")]
        public async Task<IActionResult> RespondReport([FromBody] RespondReportRequest request)
        {
            // Lấy AdminId từ Token
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var result = await _reportService.RespondToReportAsync(adminId!, request);

            if (result)
                return Ok(new { StatusCode = 200, Message = "Đã gửi phản hồi thành công." });

            return BadRequest("Không thể cập nhật phản hồi.");
        }

        /// <summary>
        /// Lấy danh sách toàn bộ báo cáo để Admin xử lý
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpGet("admin-get-all")]
        public async Task<IActionResult> GetAllReports()
        {
            var reports = await _reportService.GetAllReportsForAdminAsync();

            return Ok(new
            {
                StatusCode = 200,
                Data = reports
            });
        }

        [Authorize(Roles = "Customer")]
        [HttpGet("my-reports/{id}")]
        public async Task<IActionResult> GetMyReportDetail(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _reportService.GetReportDetailForCustomerAsync(id, userId!);

            return Ok(new { StatusCode = 200, Data = result });
        }
    }
}