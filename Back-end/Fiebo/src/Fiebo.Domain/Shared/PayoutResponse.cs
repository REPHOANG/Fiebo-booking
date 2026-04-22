using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Shared
{
    public class PayoutResponse
    {
        public int Id { get; set; }

        public required string OwnerId { get; set; }
        public string OwnerName { get; set; } = null!;

        public decimal Amount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? FailureReason { get; set; }

        public string? ProcessedBy { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }
}
