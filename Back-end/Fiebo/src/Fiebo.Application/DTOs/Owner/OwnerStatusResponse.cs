using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Owner
{
    public class OwnerStatusResponse
    {
        public bool IsProfileComplete { get; set; }
        public bool IsMembershipActive { get; set; }
        public bool HasVenue { get; set; }
        public bool HasBankAccount { get; set; }
        public string? CurrentPlanName { get; set; }
        public DateTime? PlanExpiryDate { get; set; }
        public List<string> MissingFields { get; set; } = [];
    }
}
