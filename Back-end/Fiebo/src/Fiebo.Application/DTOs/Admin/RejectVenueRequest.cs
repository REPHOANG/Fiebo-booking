using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Admin
{
    public class RejectVenueRequest
    {
        [Required(ErrorMessage = "Lý do từ chối không được để trống.")]
        public string RejectionReason { get; set; } = string.Empty;
    }
}
