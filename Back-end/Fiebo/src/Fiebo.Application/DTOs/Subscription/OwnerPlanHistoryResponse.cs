using System;

namespace Fiebo.Application.DTOs.Subscription
{
    public class OwnerPlanHistoryResponse
    {
        public int OwnerPlanId { get; set; }
        public int PlanId { get; set; }
        public string PlanName { get; set; } = null!;
        public int DurationDays { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int RemainingDays { get; set; }
        public bool IsExpired { get; set; }
        public DateTime PaidAt { get; set; }
    }
}
