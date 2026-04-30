using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/owner/subscriptions")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;

        public SubscriptionController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }

        [HttpGet("plans")]
        [Authorize]
        public async Task<IActionResult> GetAvailablePlans()
        {
            var plans = await _subscriptionService.GetAvailablePlansAsync();
            return Ok(new { Data = plans });
        }

        [HttpPost("subscribe/{planId}")]
        [Authorize(Roles = "FieldOwner")]
        public async Task<IActionResult> SubscribeToPlan(int planId)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(ownerId))
            {
                return Unauthorized(new { Message = "Không tìm thấy thông tin Owner" });
            }

            var result = await _subscriptionService.SubscribeToPlanAsync(planId, ownerId);
            return Ok(new
            {
                Message = "Đăng ký gói thành công.",
                Data = result
            });
        }

        [HttpGet("overview")]
        [Authorize(Roles = "FieldOwner")]
        public async Task<IActionResult> GetPlanOverview()
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (ownerId == null)
            {
                return Unauthorized(new { Message = "Không tìm thấy thông tin Owner" });
            }

            var currentPlan = await _subscriptionService.GetCurrentPlanAsync(ownerId);
            var history = await _subscriptionService.GetPlanPurchaseHistoryAsync(ownerId);

            return Ok(new
            {
                Data = new
                {
                    CurrentPlan = currentPlan,
                    PurchaseHistory = history
                }
            });
        }
    }
}
