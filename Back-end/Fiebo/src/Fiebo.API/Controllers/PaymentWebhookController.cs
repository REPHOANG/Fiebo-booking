using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/webhook/payment")]
    [ApiController]
    public class PaymentWebhookController : ControllerBase
    {
        private readonly IConfiguration _config;

        public PaymentWebhookController(IConfiguration config)
        {
            _config = config;
        }

        [HttpPost]
        public async Task<IActionResult> HandlePaymentWebhook()
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

            if (apiKey != _config["Sepay:ApiKey"])
            {
                return Unauthorized();
            }
            return Ok();
        }

    }
}
