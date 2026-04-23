using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.FinanceAdmin
{
    public class PaymentTransactionDetailResponse
    {
        public int Id { get; set; }
        public string Fullname { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string BankAccountNumber { get; set; } = string.Empty;
        public string BankName { get; set; } = string.Empty;
        public string BankaccountHolder { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Direction { get; set; } = string.Empty;

        public string TransactionType { get; set; } = string.Empty;

        public int? ReferenceId { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
