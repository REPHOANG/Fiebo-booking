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
        [Required(ErrorMessage = "User ID is required")]
        public required string UserId { get; set; }
        [Required(ErrorMessage = "Token is required")]
        public required string Token { get; set; }
        [Required(ErrorMessage = "NewPassword is required")]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(
            @"^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$",
            ErrorMessage = "Password must include at least one uppercase letter, one number, and one special character"
        )]
        public required string NewPassword { get; set; }
    }
}
