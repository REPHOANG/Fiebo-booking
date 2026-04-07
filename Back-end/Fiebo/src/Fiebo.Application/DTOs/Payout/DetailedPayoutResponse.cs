using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Payout
{
    public class DetailedPayoutResponse
    {
        public PayoutGeneralInfoDto GeneralInfo { get; set; } = null!;
        public PayoutFinancialSummaryDto FinancialSummary { get; set; } = null!;
        public List<VenuePayoutBreakdownDto> FacilitiesBreakdown { get; set; } = [];
    }

    public class PayoutGeneralInfoDto
    {
        public string ReferenceCode { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string Status { get; set; } = null!;
        public string? FailureReason { get; set; }
    }

    public class PayoutFinancialSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public string BankName { get; set; } = null!;
        public string MaskedAccountNumber { get; set; } = null!;
        public string AccountHolderName { get; set; } = null!;
    }

    public class VenuePayoutBreakdownDto
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = null!;
        public List<PayoutBookingDetailDto> Bookings { get; set; } = [];
        public decimal Subtotal { get; set; }
    }

    public class PayoutBookingDetailDto
    {
        public int BookingId { get; set; }
        public DateOnly PlayDate { get; set; }
        public string SubFieldName { get; set; } = null!;
        public decimal Amount { get; set; }
    }
}
