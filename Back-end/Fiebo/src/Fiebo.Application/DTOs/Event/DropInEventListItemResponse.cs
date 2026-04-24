namespace Fiebo.Application.DTOs.Event
{
    public class DropInEventListItemResponse
    {
        public int EventId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public DateOnly EventDate { get; set; }
        public List<TicketEventSlotResponse> Slots { get; set; } = [];
        public decimal TicketPrice { get; set; }
        public int RemainingTicketQuantity { get; set; }
    }
}
