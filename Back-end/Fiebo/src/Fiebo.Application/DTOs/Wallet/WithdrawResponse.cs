using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class WithdrawResponse
    {
        public int TransactionId { get; set; }
        public decimal Amount { get; set; }
        public decimal RemainingBalance { get; set; }
        public string Status { get; set; } = null!;
        public string Message { get; set; } = null!;
    }
}
