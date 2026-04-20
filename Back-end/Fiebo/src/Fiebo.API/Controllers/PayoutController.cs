using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PayoutController : ControllerBase
    {
        private readonly IPayoutService _payoutService;
        public PayoutController(IPayoutService payoutService)
        {
            _payoutService = payoutService;
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/payouts")]
        public async Task<IActionResult> GetPayoutsForOwner(
            [FromQuery] int? year,
            [FromQuery] int? month,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Ok(new ApiResponse<OwnerPayoutListResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách payout thành công",
                Data = await _payoutService.GetOwnerPayoutsAsync(ownerId, page, pageSize, year, month)
            });
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpGet("/api/owner/payouts/{id}")]
        public async Task<IActionResult> GetPayoutDetail(int id)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Unauthorized();
 
            var result = await _payoutService.GetPayoutDetailAsync(id, ownerId);
            return Ok(new ApiResponse<DetailedPayoutResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy chi tiết giao dịch thành công",
                Data = result
            });
        }

        /// <summary>
        /// BR-134: Get all owner payout records. Finance Admin only.
        /// Filterable by status, year and month.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpGet("/api/admin/payouts")]
        public async Task<IActionResult> GetPayoutsForAdmin(
            [FromQuery] string? status,
            [FromQuery] int? year,
            [FromQuery] int? month,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            PayoutStatus? payoutStatus = null;
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PayoutStatus>(status, ignoreCase: true, out var parsed))
                payoutStatus = parsed;

            var result = await _payoutService.GetAdminPayoutsAsync(page, pageSize, payoutStatus, year, month);
            return Ok(new ApiResponse<PagedResult<AdminPayoutListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách payout thành công.",
                Data = result
            });
        }

        /// <summary>
        /// BR-134 / BR-135: Mark a payout as Completed after external bank transfer is done.
        /// Finance Admin only. Records processedBy and processedAt audit fields.
        /// MSG120 on success, MSG121 on failure.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/payouts/{id}/complete")]
        public async Task<IActionResult> MarkPayoutAsCompleted([FromRoute] int id)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.MarkPayoutAsCompletedAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật trạng thái thành công.", // MSG120
            });
        }
    }
}
