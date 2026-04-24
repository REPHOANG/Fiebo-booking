using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.AdminDashboard;
using Fiebo.Application.DTOs.Subscription;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
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
    [Authorize(Roles = AppRoles.Admin)]
    public class AdminController : ControllerBase
    {
        private readonly IFinanceAdminService _financeAdminService;
        private readonly IAdminDashboardService _adminDashboardService;
        private readonly IAdminService _adminService;
        private readonly IAdminVenueService _adminVenueService;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IVenueService _venueService;

        public AdminController(
            IFinanceAdminService financeAdminService,
            IAdminDashboardService adminDashboardService,
            IAdminService adminService,
            IAdminVenueService adminVenueService,
            ISubscriptionService subscriptionService,
            IVenueService venueService)
        {
            _financeAdminService = financeAdminService;
            _adminDashboardService = adminDashboardService;
            _adminService = adminService;
            _adminVenueService = adminVenueService;
            _subscriptionService = subscriptionService;
            _venueService = venueService;
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

            // BR-A2: Empty State Check (If there's no data for the queried period, return specific message, but still DTO to avoid breaking charts UI structure)
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

        /// <summary>
        /// Lấy danh sách khách hàng (Customer) với bộ lọc và phân trang
        /// </summary>
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers([FromQuery] CustomerFilter filter)
        {
            var result = await _adminService.GetCustomerListAsync(filter);

            return Ok(new ApiResponse<PagedResult<CustomerResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách khách hàng thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Reset mật khẩu cho Finance Admin
        /// </summary>
        [HttpPut("finance-admins/{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id)
        {
            try
            {
                var newPassword = await _adminService.ResetFinanceAdminPasswordAsync(id);

                return Ok(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Reset mật khẩu thành công. Mật khẩu mới đã được tạo.",
                    Data = new { TempPassword = newPassword }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Get a paginated list of pending venue registrations.
        /// </summary>
        [HttpGet("venues/pending")]
        public async Task<IActionResult> GetPendingVenues([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _adminVenueService.GetPendingVenuesAsync(page, pageSize);
            return Ok(new ApiResponse<Fiebo.Domain.Shared.PagedResult<PendingVenueListItemResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách yêu cầu đăng ký cơ sở chờ duyệt thành công.",
                Data = result
            });
        }
        /// <summary>
        /// Get detailed information of a pending venue registration.
        /// </summary>
        [HttpGet("venues/pending/{id}")]
        public async Task<IActionResult> GetPendingVenueDetail([FromRoute] int id)
        {
            var result = await _adminVenueService.GetPendingVenueDetailAsync(id);
            return Ok(new ApiResponse<PendingVenueDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy chi tiết yêu cầu chờ duyệt thành công.",
                Data = result
            });
        }
        /// <summary>
        /// Approve a venue registration request.
        /// </summary>
        [HttpPost("venues/{id}/approve")]
        public async Task<IActionResult> ApproveVenue([FromRoute] int id)
        {
            await _adminVenueService.ApproveVenueAsync(id);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Phê duyệt cơ sở thành công."
            });
        }
        /// <summary>
        /// Reject a venue registration request.
        /// </summary>
        [HttpPost("venues/{id}/reject")]
        public async Task<IActionResult> RejectVenue([FromRoute] int id, [FromBody] RejectVenueRequest request)
        {
            await _adminVenueService.RejectVenueAsync(id, request);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã từ chối đăng ký cơ sở."
            });
        }

        // ─── Subscription Plan Management ─────────────────────────────────────

        /// <summary>
        /// Lấy danh sách gói đăng ký đang hoạt động (dùng cho trang quản lý Admin).
        /// </summary>
        [HttpGet("subscription-plans")]
        public async Task<IActionResult> GetAllSubscriptionPlans()
        {
            var result = await _subscriptionService.GetAvailablePlansAsync();
            return Ok(new ApiResponse<List<SubscriptionPlanResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách gói đăng ký thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Tạo gói đăng ký mới.
        /// </summary>
        [HttpPost("subscription-plans")]
        public async Task<IActionResult> CreateSubscriptionPlan([FromBody] CreateSubscriptionPlanRequest request)
        {
            var result = await _subscriptionService.CreatePlanAsync(request);
            return Ok(new ApiResponse<SubscriptionPlanResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo gói đăng ký thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Chỉnh sửa gói đăng ký.
        /// - Nếu gói CHƯA có ai đăng ký → edit trực tiếp.
        /// - Nếu gói ĐÃ có người đăng ký → soft-delete gói cũ + tạo gói mới (Id sẽ thay đổi).
        /// </summary>
        [HttpPut("subscription-plans/{id}")]
        public async Task<IActionResult> UpdateSubscriptionPlan([FromRoute] int id, [FromBody] UpdateSubscriptionPlanRequest request)
        {
            var result = await _subscriptionService.UpdatePlanAsync(id, request);
            return Ok(new ApiResponse<SubscriptionPlanResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật gói đăng ký thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Xóa mềm gói đăng ký. Gói sẽ không hiển thị cho owner nhưng vẫn được giữ lại vì lý do lịch sử.
        /// </summary>
        [HttpDelete("subscription-plans/{id}")]
        public async Task<IActionResult> DeleteSubscriptionPlan([FromRoute] int id)
        {
            await _subscriptionService.DeletePlanAsync(id);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa gói đăng ký thành công."
            });
        }

        [HttpGet("owners")]
        public async Task<IActionResult> GetOwners([FromQuery] OwnerListRequest filter)
        {
            var result = await _adminService.GetOwnerListAsync(filter);
            return Ok(new ApiResponse<PagedResult<OwnerListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách chủ sở hữu thành công.",
                Data = result
            });
        }

        [HttpGet("owners/{id}")]
        public async Task<IActionResult> GetOwner([FromRoute] string id)
        {
            var result = await _adminService.GetOwnerAsync(id);
            return Ok(new ApiResponse<OwnerDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin chủ sở hữu thành công.",
                Data = result
            });
        }

        [HttpGet("venue/{id}")]
        public async Task<IActionResult> GetVenue([FromRoute] int id)
        {
            var result = await _adminService.GetVenueDetailAsync(id);
            return Ok(new ApiResponse<VenueDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin cơ sở thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Lock/Unlock the venue
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPatch("venue/{id}")]
        public async Task<IActionResult> UpdateVenueStatus([FromRoute] int id)
        {
            await _adminService.UpdateVenueStatusAsync(id);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật trạng thái cơ sở thành công."
            });
        }

        /// <summary>
        /// Admin duyệt yêu cầu cập nhật địa chỉ / giấy tờ của cơ sở.
        /// </summary>
        [HttpPost("venue-updates/{id}/approve")]
        public async Task<IActionResult> ApproveVenueUpdate([FromRoute] int id)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await _venueService.ApproveVenueUpdateAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã duyệt yêu cầu cập nhật cơ sở."
            });
        }

        /// <summary>
        /// Admin từ chối yêu cầu cập nhật địa chỉ / giấy tờ của cơ sở + gửi email thông báo.
        /// </summary>
        [HttpPost("venue-updates/{id}/reject")]
        public async Task<IActionResult> RejectVenueUpdate([FromRoute] int id, [FromBody] RejectVenueRequest request)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await _venueService.RejectVenueUpdateAsync(id, adminId, request.RejectionReason);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã từ chối yêu cầu cập nhật cơ sở và thông báo cho chủ sân."
            });
        }
    }
}