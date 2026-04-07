using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Event
{
    public class UpdateEventRequest
    {
        [Required]
        [Range(1, int.MaxValue)]
        public decimal PricePerPerson { get; set; }
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số người tối thiểu phải lớn hơn 0")]
        public int MinPlayer { get; set; }
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số người tối đa phải lớn hơn 0")]
        public int MaxPlayer { get; set; }

        public string? Description { get; set; }
    }
}
