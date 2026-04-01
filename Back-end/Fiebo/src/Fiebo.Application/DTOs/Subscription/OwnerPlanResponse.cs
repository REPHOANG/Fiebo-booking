using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Subscription
{
    public class OwnerPlanResponse
    {
        public int OwnerPlanId { get; set; }
        public string PlanName { get; set; } = null!;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal RemainingBalance { get; set; }
    }
}
