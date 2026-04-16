using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.AdminDashboard;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Admin)] 
    public class AdminController : ControllerBase
    {
        private readonly IFinanceAdminService _financeAdminService;
        private readonly IAdminDashboardService _adminDashboardService;

        public AdminController(IFinanceAdminService financeAdminService, IAdminDashboardService adminDashboardService)
        {
            _financeAdminService = financeAdminService;
            _adminDashboardService = adminDashboardService;
        }

        /// <summary>
        /// Lấy danh sách tài khoản Finance Admin
        /// </summary>
        [HttpGet("finance-admins")]
        public async Task<IActionResult> GetFinanceAdmins()
        {
            var result = await _financeAdminService.GetFinanceAdminListAsync();
            return Ok(new ApiResponse<List<FinanceAdminListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách Finance Admin thành công.",
                Data = result
            });
        }

        /// <summary>
        /// UC-66: Tạo tài khoản Finance Admin mới
        /// </summary>
        [HttpPost("finance-admins")]
        public async Task<IActionResult> CreateFinanceAdmin([FromBody] CreateFinanceAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Username và Password không được để trống."
                });
            }

            await _financeAdminService.CreateFinanceAdminAsync(request);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Thêm nhân viên thành công."
            });
        }

        /// <summary>
        /// Xem bảng điều khiển phân tích Admin
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] DashboardRequest request)
        {
            var result = await _adminDashboardService.GetDashboardAsync(request);
            
            if (result.TotalRevenue.Value == 0 && result.TotalBookings.Value == 0)
            {
                return Ok(new ApiResponse<AdminDashboardResponse>
                {
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Không tìm thấy dữ liệu cho khoảng thời gian này. Vui lòng thử khoảng thời gian khác.",
                    Data = result
                });
            }

            return Ok(new ApiResponse<AdminDashboardResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy dữ liệu bảng điều khiển thành công.",
                Data = result
            });
        }
    }
}