namespace Fiebo.Application.DTOs.Admin
{
    public class PendingVenueListItemResponse
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime SubmittedDate { get; set; }
    }
}
