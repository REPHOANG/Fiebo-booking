using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Subscription
{
    public class UpdateSubscriptionPlanRequest
    {
        [Required(ErrorMessage = "Tên gói không được để trống.")]
        [MaxLength(100, ErrorMessage = "Tên gói không được vượt quá 100 ký tự.")]
        public required string Name { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Số ngày hiệu lực phải lớn hơn 0.")]
        public int DurationDays { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Giá gói phải lớn hơn 0.")]
        public decimal Price { get; set; }
    }
}
