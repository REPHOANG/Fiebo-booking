using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class WalletTransactionResponse
    {
        public int Id { get; set; }

        public decimal Amount { get; set; }

        public required string Direction { get; set; }

        public required string TransactionType { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public int? ReferenceId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
