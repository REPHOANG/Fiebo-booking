namespace Fiebo.Application.DTOs.Field
{
    public class OwnerFieldListItemResponse
    {
        public int FieldId { get; set; }
        public required string FieldName { get; set; }
        public required string SportType { get; set; }
        public required string Status { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
    }
}
