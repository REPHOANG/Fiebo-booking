using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Shared
{
    public class PaymentTransactionResponse
    {
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public string Fullname { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Direction { get; set; } = string.Empty;

        public string TransactionType { get; set; } = string.Empty;

        public int? ReferenceId { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
