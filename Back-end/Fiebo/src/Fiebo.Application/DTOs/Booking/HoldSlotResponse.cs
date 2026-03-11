namespace Fiebo.Application.DTOs.Booking
{
    public class HoldSlotResponse
    {
        public int BookingId { get; set; }
        public decimal TotalPrice { get; set; }
        public DateTime ExpiredAt { get; set; }
        public string BookingStatus { get; set; } = string.Empty;
    }
}
