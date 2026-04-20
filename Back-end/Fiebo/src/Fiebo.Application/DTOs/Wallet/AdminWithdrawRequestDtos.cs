using System;

namespace Fiebo.Application.DTOs.Wallet
{
    /// <summary>
    /// List item DTO for admin withdrawal request view (MSG122 on retrieval error).
    /// </summary>
    public class AdminWithdrawRequestListItem
    {
        public int TransactionId { get; set; }
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime RequestedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Detail DTO for a specific withdrawal request.
    /// Includes bank account info and current wallet balance per BR-130 / BR-131.
    /// </summary>
    public class AdminWithdrawRequestDetail
    {
        public int TransactionId { get; set; }
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal WalletBalance { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? AccountHolderName { get; set; }
        public string? Description { get; set; }
        public DateTime RequestedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
