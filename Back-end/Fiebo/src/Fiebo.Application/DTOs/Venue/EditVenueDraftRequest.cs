using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Fiebo.Application.DTOs.Venue
{
    public class EditVenueDraftRequest
    {
        [Required(ErrorMessage = "Tên cơ sở là bắt buộc.")]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [MaxLength(250)]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Giờ mở cửa là bắt buộc.")]
        public TimeOnly OpenTime { get; set; }

        [Required(ErrorMessage = "Giờ đóng cửa là bắt buộc.")]
        public TimeOnly CloseTime { get; set; }

        public bool DeletedThumbnail { get; set; }

        [MaxLength(100)]
        public string AddressDetail { get; set; } = null!;

        public int ProvinceId { get; set; }

        public int WardId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public IFormFile? ThumbnailImage { get; set; }
    }
}
