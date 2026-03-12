using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/webhook/payment")]
    [ApiController]
    public class PaymentWebhookController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IWalletService _walletService;

        public PaymentWebhookController(IConfiguration config, IWalletService walletService)
        {
            _config = config;
            _walletService = walletService;
        }

        [HttpPost]
        public async Task<IActionResult> HandlePaymentWebhook(SepayWebhookRequest request)
        {
            var authHeader = Request.Headers.Authorization.FirstOrDefault();

            if (string.IsNullOrEmpty(authHeader))
            {
                return Unauthorized();
            }

            if (!authHeader.StartsWith("Apikey "))
            {
                return Unauthorized();
            }

            var apiKey = authHeader.Substring("Apikey ".Length).Trim();
            if (apiKey != _config["WebhookSepay:Apikey"])
            {
                return Unauthorized();
            }
            var result = await _walletService.TopUpWalletAsync(request);
            if(result == false)
            {
                return BadRequest();
            }
            return Ok();
        }

    }
}
