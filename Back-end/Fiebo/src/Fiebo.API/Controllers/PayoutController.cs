using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
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
    }
}
