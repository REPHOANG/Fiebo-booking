using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Payout
{
    public class AdminPayoutListResponse
    {
        public int Id { get; set; }
        public string OwnerId { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? ProcessedAt { get; set; }
        public string? ProcessedBy { get; set; }
    }
}
