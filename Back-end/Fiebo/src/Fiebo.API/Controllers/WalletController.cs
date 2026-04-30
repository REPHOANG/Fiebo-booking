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
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo yêu cầu nạp tiền thành công.",
                Data = new
                {
                    TopUpId = await _walletService.GenerateTopUpQrAsync(request.Amount, userId)
                }
            });

        }

        [Authorize]
        [HttpGet("top-up/{id}")]
        public async Task<IActionResult> GetTopUpRequest([FromRoute]int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var result = await _walletService.GetTopUpRequest(id, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin yêu cầu nạp tiền thành công.",
                Data = result
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
        /// <summary>
        /// Withdraw from wallet to a bank account.
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [Authorize(Roles = AppRoles.Customer + "," + AppRoles.FieldOwner)]
        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] Application.DTOs.Wallet.WithdrawRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? AppRoles.Customer;

            var result = await _walletService.WithdrawAsync(userId!, userRole, request);
            return Ok(new ApiResponse<Application.DTOs.Wallet.WithdrawResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = result.Message,
                Data = result
            });
        }

        [Authorize]
        [HttpGet("bank-accounts")]
        public async Task<IActionResult> GetBankAccounts()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var accounts = await _walletService.GetUserBankAccountsAsync(userId!);
            return Ok(new ApiResponse<IEnumerable<BankAccountResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách tài khoản ngân hàng thành công.",
                Data = accounts
            });
        }

        [Authorize]
        [HttpPost("bank-accounts")]
        public async Task<IActionResult> CreateBankAccount([FromBody] CreateBankAccountRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var account = await _walletService.CreateBankAccountAsync(userId!, request);
            return Ok(new ApiResponse<BankAccountResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Thêm tài khoản ngân hàng thành công.",
                Data = account
            });
        }

        [Authorize]
        [HttpPut("bank-accounts/{id}")]
        public async Task<IActionResult> UpdateBankAccount(int id, [FromBody] UpdateBankAccountRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _walletService.UpdateBankAccountAsync(userId!, id, request);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật tài khoản ngân hàng thành công."
            });
        }

        [Authorize]
        [HttpDelete("bank-accounts/{id}")]
        public async Task<IActionResult> DeleteBankAccount(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _walletService.DeleteBankAccountAsync(userId!, id);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa tài khoản ngân hàng thành công."
            });
        }
    }
}

