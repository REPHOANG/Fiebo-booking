using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Account is required.")]
        public required string Account { get; set; }
    }
}
