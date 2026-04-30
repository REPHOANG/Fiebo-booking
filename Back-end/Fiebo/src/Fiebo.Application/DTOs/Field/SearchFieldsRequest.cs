namespace Fiebo.Application.DTOs.Field
{
    public class SearchFieldsRequest
    {
        public int? ProvinceId { get; set; }
        public int? WardId { get; set; }
        public string? Name { get; set; }
        public DateOnly? Date { get; set; }
        public TimeOnly? Time { get; set; }
        public int? SportTypeId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public double? RadiusKm { get; set; }
        public double UserLat { get; set; } = 21.027381;
        public double UserLng { get; set; } = 105.833529;
    }
}
