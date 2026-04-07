using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Payout : BaseEntity
    {
        public int BatchId { get; set; }
        public required string OwnerId { get; set; }
        public required string ReferenceCode { get; set; }
        public int BankAccountId { get; set; }
        public decimal Amount { get; set; }
        public PayoutStatus Status { get; set; }
        public string? FailureReason { get; set; }
        public DateTime? ProcessedAt { get; set; }

        // Navigation
        public PayoutBatch Batch { get; set; } = null!;
        public UserBankAccount BankAccount { get; set; } = null!;
        public ICollection<PayoutDetail> PayoutDetails { get; set; } = new List<PayoutDetail>();
    }
}
