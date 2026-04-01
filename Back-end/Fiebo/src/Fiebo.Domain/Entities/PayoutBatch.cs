using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class PayoutBatch : BaseEntity
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }

        public decimal TotalAmount { get; set; }

        public PayoutStatus Status { get; set; }

        // Navigation
        public ICollection<Payout> Payouts { get; set; } = [];
    }
}
