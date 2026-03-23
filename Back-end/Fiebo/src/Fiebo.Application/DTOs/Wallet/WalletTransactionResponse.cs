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

        public int? ReferenceId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
