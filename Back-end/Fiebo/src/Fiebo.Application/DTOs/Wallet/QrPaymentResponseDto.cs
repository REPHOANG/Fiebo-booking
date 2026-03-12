using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class QrPaymentResponseDto
    {
        public required string QrImageUrl { get; set; }

        public required string BankName { get; set; }

        public required string AccountName { get; set; }

        public required string AccountNumber { get; set; }

        public decimal Amount { get; set; }

        public required string TransferContent { get; set; }
    }
}
