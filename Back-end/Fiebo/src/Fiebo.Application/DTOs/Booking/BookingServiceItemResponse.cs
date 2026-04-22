namespace Fiebo.Application.DTOs.Booking
{
    public class BookingServiceItemResponse
    {
        public string ServiceName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
