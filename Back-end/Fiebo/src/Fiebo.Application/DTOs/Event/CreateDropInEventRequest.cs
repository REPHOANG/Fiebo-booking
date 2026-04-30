using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Event
{
    public class CreateDropInEventRequest
    {
        [Required]
        public int VenueId { get; set; }
        [Required(ErrorMessage = "Tên sự kiện không được bỏ trống")]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateOnly EventDate { get; set; }

        [Required]
        public List<CreateDropInEventDetailRequest> Details { get; set; } = [];

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Phí tham gia phải lớn hơn 0.")]
        public decimal PricePerPerson { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số người tối thiểu phải lớn hơn 0.")]
        public int MinPlayer { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số người tối đa phải lớn hơn 0.")]
        public int MaxPlayer { get; set; }

        public string? Description { get; set; }
    }

    public class CreateDropInEventDetailRequest
    {
        [Required]
        public int FieldId { get; set; }

        [Required]
        public int SlotId { get; set; }
    }
}
