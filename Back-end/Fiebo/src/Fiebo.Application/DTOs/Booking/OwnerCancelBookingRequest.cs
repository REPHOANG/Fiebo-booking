using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Booking
{
    public class OwnerCancelBookingRequest
    {
        [Required(ErrorMessage = "Lý do hủy là bắt buộc.")]
        [StringLength(500, MinimumLength = 1, ErrorMessage = "Lý do hủy phải từ 1 đến 500 ký tự.")]
        public required string CancelReason { get; set; }
    }
}
