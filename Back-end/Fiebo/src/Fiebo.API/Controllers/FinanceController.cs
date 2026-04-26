using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.FinanceAdmin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/admin/finance")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.FinanceAdmin)]
    [ApiController]
    public class FinanceController : ControllerBase
    {
        private readonly IFinanceAdminService _financeAdminService;
        public FinanceController(IFinanceAdminService financeAdminService)
        {
            _financeAdminService = financeAdminService;
        }

        /// <summary>
        /// Get payment transaction list with pagination and filter by date range, status, name, type
        /// </summary>
        /// <param name="filter"></param>
        /// <param name="page"></param>
        /// <param name="pageSize"></param>
        /// <returns></returns>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilter filter, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var transactions = await _financeAdminService.GetPaymentTransactionAsync(page, pageSize, filter);
            return Ok(new ApiResponse<PagedResult<PaymentTransactionResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách giao dịch thành công",
                Data = transactions
            });
        }

        /// <summary>
        /// Get payment transaction detail by id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("transaction/{id}")]
        public async Task<IActionResult> GetTransactionDetail([FromRoute] int id)
        {
            var transaction = await _financeAdminService.GetPaymentTransactionDetailAsync(id);
            return Ok(new ApiResponse<PaymentTransactionDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin giao dịch thành công",
                Data = transaction
            });
        }

        /// <summary>
        /// Get the list of payout batches with pagination and filter by date range, status
        /// </summary>
        /// <param name="year"></param>
        /// <param name="month"></param>
        /// <param name="status"></param>
        /// <param name="page"></param>
        /// <param name="pageSize"></param>
        /// <returns></returns>
        [HttpGet("payout-batches")]
        public async Task<IActionResult> GetPayoutBatches([FromQuery] int? year, [FromQuery] int? month, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var batches = await _financeAdminService.GetPayoutBatchesAsync(page, pageSize, year, month, status);
            return Ok(new ApiResponse<PagedResult<PayoutBatchResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách batch thanh toán thành công",
                Data = batches
            });

        }

        /// <summary>
        /// Get the list of payouts in a batch with pagination and filter by name, status
        /// </summary>
        /// <param name="name"></param>
        /// <param name="status"></param>
        /// <param name="id"></param>
        /// <param name="page"></param>
        /// <param name="pageSize"></param>
        /// <returns></returns>
        [HttpGet("payout-batch/{id}/payouts")]
        public async Task<IActionResult> GetPayoutsInBatch([FromQuery] string? name, [FromQuery] string? status, [FromRoute] int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var payouts = await _financeAdminService.GetPayoutsByBatchIdAsync(id, page, pageSize, name, status);
            return Ok(new ApiResponse<PagedResult<PayoutResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách thanh toán trong batch thành công",
                Data = payouts
            });
        }

        /// <summary>
        /// Get the payout detail by id, including owner info, bank account info, amount, status and list of bookings in the payout
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("payout/{id}")]
        public async Task<IActionResult> GetPayoutDetail([FromRoute] int id)
        {
            var payout = await _financeAdminService.GetPayoutDetailAsync(id);
            return Ok(new ApiResponse<PayoutDetailResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin thanh toán thành công",
                Data = payout
            });
        }
        
        [HttpPatch("payout-batch/{id}/complete")]
        public async Task<IActionResult> CompletePayoutBatch([FromRoute] int id)
        {
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            await _financeAdminService.CompletePayoutBatchAsync(id, adminId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật trạng thái batch và các payout thành công.",
            });
        }
    }
}
