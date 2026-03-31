using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class OwnerPlan : BaseEntity
    {
        public required string OwnerId { get; set; }
        public int PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime PaidAt { get; set; }
        public decimal Price { get; set; }
        public OwnerPlanStatus Status { get; set; }

        // Navigation
        public SubscriptionPlan Plan { get; set; } = null!;
    }
}
