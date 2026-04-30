using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class WalletTransaction
    {
        public int Id { get; set; }

        public int WalletId { get; set; }
        public Wallet Wallet { get; set; }

        public decimal Amount { get; set; }

        public TransactionDirection Direction { get; set; }

        public TransactionType TransactionType { get; set; }

        public int? ReferenceId { get; set; }

        public TransactionStatus Status { get; set; } = TransactionStatus.Success;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Audit fields for withdrawal processing (BR-136 / BR-137)
        public string? ProcessedBy { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? RejectionReason { get; set; }
    }
}
