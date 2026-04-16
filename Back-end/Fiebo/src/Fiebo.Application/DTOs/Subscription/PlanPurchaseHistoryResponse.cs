using System;

namespace Fiebo.Application.DTOs.Subscription
{
    public class PlanPurchaseHistoryResponse
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = null!;
        public decimal Price { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}