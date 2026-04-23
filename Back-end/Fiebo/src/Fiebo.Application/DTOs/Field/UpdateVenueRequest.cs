using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Fiebo.Application.DTOs.Field
{
    public class UpdateVenueRequest
    {
        [Required(ErrorMessage = "Tên cơ sở là bắt buộc.")]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Địa chỉ cụ thể là bắt buộc.")]
        public string AddressDetail { get; set; } = null!;

        [Required(ErrorMessage = "Tỉnh/Thành phố là bắt buộc.")]
        public int ProvinceId { get; set; }

        [Required(ErrorMessage = "Phường/Xã là bắt buộc.")]
        public int WardId { get; set; }

        public double Longitude { get; set; }

        public double Latitude { get; set; }

        [Required(ErrorMessage = "Giờ mở cửa là bắt buộc.")]
        public TimeOnly OpenTime { get; set; }

        [Required(ErrorMessage = "Giờ đóng cửa là bắt buộc.")]
        public TimeOnly CloseTime { get; set; }

        public IFormFile? ThumbnailImage { get; set; }

        public Fiebo.Application.DTOs.Venue.UpdateVenueDocumentDto? BusinessDocument { get; set; }
    }
}
