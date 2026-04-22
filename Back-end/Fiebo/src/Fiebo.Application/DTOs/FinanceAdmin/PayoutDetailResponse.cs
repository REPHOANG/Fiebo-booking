using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.FinanceAdmin
{
    public class PayoutDetailResponse
    {
        public int Id { get; set; }

        public int PayoutId { get; set; }

        // Owner info
        public string OwnerName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;

        // Bank info
        public string BankAccountName { get; set; } = null!;
        public string BankAccountNumber { get; set; } = null!;
        public string BankAccountHolderName { get; set; } = null!;
        public decimal Amount { get; set; }
        public string Status { get; set; } = null!;

        // Danh sách booking
        public List<PayoutBookingItem> Bookings { get; set; } = [];
    }
    public class PayoutBookingItem
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = null!;
        public int? BookingId { get; set; }
        public int? EventId { get; set; }
        public string PayoutDetailType { get; set; } = null!;
        public decimal Amount { get; set; }

        public string Status { get; set; } = null!;

        public DateOnly? Date { get; set; }
    }
}
