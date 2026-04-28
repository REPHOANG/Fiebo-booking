using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class ResubmitVenueRequest
    {
        [Required(ErrorMessage = "Tên cơ sở là bắt buộc.")]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Giờ mở cửa là bắt buộc.")]
        public TimeOnly OpenTime { get; set; }

        [Required(ErrorMessage = "Giờ đóng cửa là bắt buộc.")]
        public TimeOnly CloseTime { get; set; }
        [Required(ErrorMessage = "Địa chỉ là bắt buộc.")]
        public int ProvinceId { get; set; }
        [Required(ErrorMessage = "Địa chỉ là bắt buộc.")]
        public int WardId { get; set; }
        [Required(ErrorMessage = "Địa chỉ là bắt buộc.")]
        public required string AddressDetail { get; set; }
        [Required(ErrorMessage = "Vị trí là bắt buộc.")]
        public double Longitude { get; set; }
        [Required(ErrorMessage = "Vị trí là bắt buộc.")]
        public double Latitude { get; set; }
        [Required]
        public bool ThumbnailDeleted { get; set; }
        public IFormFile? ThumbnailImage { get; set; }
        [Required]
        public required UpdateVenueDocumentRequest Document { get; set; }
    }
}
