using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class ResetPasswordDTO
    {
        [Required(ErrorMessage = "New password is required")]
        public required string NewPassword { get; set; }
    }
}
