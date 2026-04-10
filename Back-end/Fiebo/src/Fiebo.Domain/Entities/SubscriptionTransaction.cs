using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class SubscriptionTransaction : BaseEntity
    {
        public int OwnerPlanId { get; set; }
        public int PlanId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaidAt { get; set; }

        // Navigation
        public OwnerPlan OwnerPlan { get; set; } = null!;
        public SubscriptionPlan Plan { get; set; } = null!;
    }
}
