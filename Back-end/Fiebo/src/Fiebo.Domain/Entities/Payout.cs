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
        public int OwnerId { get; set; }

        public decimal Amount { get; set; }

        public PayoutStatus Status { get; set; }

        // Navigation
        public PayoutBatch Batch { get; set; } = null!;
        public ICollection<PayoutDetail> PayoutDetails { get; set; } = new List<PayoutDetail>();
    }
}
