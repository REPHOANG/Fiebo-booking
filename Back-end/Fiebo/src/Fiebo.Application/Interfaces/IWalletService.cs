using Fiebo.Application.DTOs.Wallet;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(string userId);
        Task<QrPaymentResponseDto> GenerateTopUpQrAsync(decimal amount, string userId);
        Task<bool> TopUpWalletAsync(SepayWebhookRequest request);
    }
}
