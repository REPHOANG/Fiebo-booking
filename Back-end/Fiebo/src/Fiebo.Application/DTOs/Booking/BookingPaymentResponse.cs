namespace Fiebo.Application.DTOs.Booking
{
    public class BookingPaymentResponse
    {
        public int BookingId { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingBalance { get; set; }
        public string BookingStatus { get; set; } = string.Empty;
    }
}
