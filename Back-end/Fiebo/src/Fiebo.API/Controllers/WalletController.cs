using Fiebo.API.Services;
using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
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

        /// <summary>
        /// Get the current balance of the user's wallet.
        /// </summary>
        /// <returns></returns>
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

        /// <summary>
        /// Get the qr code and bank account information to top up user wallet.
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
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

        /// <summary>
        /// Strea for notification when user top up the wallet successfully.
        /// </summary>
        /// <param name="userId"></param>
        /// <param name="sse"></param>
        /// <returns></returns>
        [HttpGet("stream")]
        public async Task Stream([FromQuery] string userId, [FromServices] SseService sse)
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            sse.AddClient(userId, Response); await Task.Delay(-1);
        }

        [Authorize(Roles = AppRoles.Customer + "," + AppRoles.FieldOwner)]
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10
            )
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var transactions = await _walletService
                .GetWalletTransactionsAsync(userId!, page, pageSize, from, to);
            return Ok(new ApiResponse<PagedResult<WalletTransactionResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy lịch sử giao dịch thành công.",
                Data = transactions
            });
        }
    }
}

