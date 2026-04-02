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
        public async Task<IActionResult> GetPayoutsForOwner([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Ok(new ApiResponse<PagedResult<OwnerPayoutsResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách payout thành công",
                Data = await _payoutService.GetOwnerPayoutsAsync(ownerId, page, pageSize)
            });
        }

    }
}
