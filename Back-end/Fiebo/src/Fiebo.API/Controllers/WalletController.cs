using Fiebo.API.Services;
using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [Authorize]
        [HttpGet("balance")]
        public async Task<ActionResult<decimal>> GetBalance()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy số dư thành công.",
                Data = new
                {
                    Balance = await _walletService.GetBalanceAsync(userId!)
                }
            });
        }

        [Authorize]
        [HttpPost("top-up")]
        public async Task<IActionResult> TopUpUserWallet(Application.DTOs.Wallet.TopUpRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Ok(new ApiResponse<QrPaymentResponseDto>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo yêu cầu nạp tiền thành công.",
                Data = await _walletService.GenerateTopUpQrAsync(request.Amount, userId ?? "")
            });

        }

        [HttpGet("wallet/stream")]
        public async Task Stream(string userId, [FromServices] SseService sse)
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            sse.AddClient(userId, Response); await Task.Delay(-1);
        }
    }
}

