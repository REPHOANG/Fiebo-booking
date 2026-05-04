using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Reset token is required")]
        public required string ResetToken { get; set; }
        [Required(ErrorMessage = "NewPassword is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public required string NewPassword { get; set; }
    }
}
