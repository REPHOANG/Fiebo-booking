using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class SubscriptionPlan : BaseEntity
    {
        public required string Name { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }

        // Navigation
        public ICollection<OwnerPlan> OwnerPlans { get; set; } = [];
        public ICollection<SubscriptionTransaction> SubscriptionTransactions { get; set; } = [];
    }
}
