using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Fiebo.Application.DTOs.Field
{
    public class CreateFieldRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập Tên sân.")]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn Môn thể thao.")]
        public int SportTypeId { get; set; }

        public List<IFormFile>? Images { get; set; }
    }
}
