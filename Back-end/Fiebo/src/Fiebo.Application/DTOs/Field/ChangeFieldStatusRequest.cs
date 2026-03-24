using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Field
{
    public class ChangeFieldStatusRequest
    {
        [Required(ErrorMessage = "Vui lòng chọn trạng thái mới.")]
        [RegularExpression("^(Active|Inactive)$", ErrorMessage = "Trạng thái không hợp lệ. Chỉ chấp nhận 'Active' hoặc 'Inactive'.")]
        public string Status { get; set; } = null!;
    }
}
