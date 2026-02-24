using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class VerifyResetOtpRequest
    {
        [Required(ErrorMessage = "Account is required")]
        public required string Account { get; set; }
        [Required(ErrorMessage = "OTP code is required")]
        public required string OtpCode { get; set; }

    }
}
