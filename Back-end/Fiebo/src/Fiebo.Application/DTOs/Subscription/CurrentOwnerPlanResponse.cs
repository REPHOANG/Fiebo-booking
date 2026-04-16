using Fiebo.Domain.Enums;
using System;

namespace Fiebo.Application.DTOs.Subscription
{
    public class CurrentOwnerPlanResponse
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = null!;
        public DateTime EndDate { get; set; }
        public int RemainingDays { get; set; }
        public OwnerPlanStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}