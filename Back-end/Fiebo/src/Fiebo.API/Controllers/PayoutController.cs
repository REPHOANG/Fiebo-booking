using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.DTOs.Wallet;
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

        [Authorize(Roles = AppRoles.FieldOwner)]
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

        [Authorize(Roles = AppRoles.FieldOwner)]
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
        /// Kế toán bắt đầu xử lý payout (Pending → Processing).
        /// Finance Admin only.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/payouts/{id}/process")]
        public async Task<IActionResult> StartProcessingPayout([FromRoute] int id)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.StartProcessingPayoutAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã chuyển payout sang trạng thái Processing.",
            });
        }

        /// <summary>
        /// Kế toán hoàn thành payout sau khi đã chuyển khoản thực tế (Processing → Completed).
        /// Finance Admin only.
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
                Message = "Cập nhật trạng thái thành công.",
            });
        }

        /// <summary>
        /// Kế toán đánh dấu payout thất bại (Processing → Failed) với lý do.
        /// Finance Admin only.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/payouts/{id}/fail")]
        public async Task<IActionResult> MarkPayoutAsFailed([FromRoute] int id, [FromBody] MarkPayoutAsFailedDto request)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.MarkPayoutAsFailedAsync(id, adminId, request.FailureReason);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã đánh dấu payout thất bại.",
            });
        }

        /// <summary>
        /// BR-130 / BR-131: View all customer withdrawal requests (Finance Admin only).
        /// Filterable by status. Returns MSG122 on retrieval error (handled by global exception middleware).
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpGet("/api/admin/withdraw-requests")]
        public async Task<IActionResult> GetWithdrawRequests(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            TransactionStatus? txStatus = null;
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TransactionStatus>(status, ignoreCase: true, out var parsed))
                txStatus = parsed;

            var result = await _payoutService.GetAdminWithdrawRequestsAsync(page, pageSize, txStatus);
            return Ok(new ApiResponse<PagedResult<AdminWithdrawRequestListItem>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách yêu cầu rút tiền thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Get detail of a specific customer withdrawal request (Finance Admin only).
        /// Exposes customer name, bank account, amount, and wallet balance.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpGet("/api/admin/withdraw-requests/{id}")]
        public async Task<IActionResult> GetWithdrawRequestDetail([FromRoute] int id)
        {
            var result = await _payoutService.GetAdminWithdrawRequestDetailAsync(id);
            return Ok(new ApiResponse<AdminWithdrawRequestDetail>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy chi tiết yêu cầu rút tiền thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Kế toán bắt đầu xử lý yêu cầu rút tiền (Pending → Processing).
        /// Finance Admin only.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/withdraw-requests/{id}/process")]
        public async Task<IActionResult> StartProcessingWithdrawRequest([FromRoute] int id)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.StartProcessingWithdrawAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã chuyển yêu cầu rút tiền sang trạng thái Processing.",
            });
        }

        /// <summary>
        /// Kế toán hoàn thành yêu cầu rút tiền sau khi đã chuyển khoản (Processing → Success).
        /// Finance Admin only.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/withdraw-requests/{id}/complete")]
        public async Task<IActionResult> CompleteWithdrawRequest([FromRoute] int id)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.CompleteWithdrawRequestAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật trạng thái thành công.",
            });
        }

        /// <summary>
        /// AF 7.2 / BR-137: Reject a customer withdrawal request with a required reason.
        /// Finance Admin only. Refunds the amount back to the customer wallet automatically.
        /// </summary>
        [Authorize(Roles = AppRoles.FinanceAdmin)]
        [HttpPatch("/api/admin/withdraw-requests/{id}/reject")]
        public async Task<IActionResult> RejectWithdrawRequest([FromRoute] int id, [FromBody] RejectWithdrawRequestDto request)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _payoutService.RejectWithdrawRequestAsync(id, adminId, request.RejectionReason);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật trạng thái thành công.", // MSG120
            });
        }
    }
}
