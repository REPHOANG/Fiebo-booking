using Fiebo.API.Wrappers;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
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

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilter filter,[FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var transactions = await _financeAdminService.GetPaymentTransactionAsync(page, pageSize, filter);
            return Ok(new ApiResponse<PagedResult<PaymentTransactionResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách giao dịch thành công",
                Data = transactions
            });
        }
    }
}
