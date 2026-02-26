using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class VerifyLoginOtpRequest
    {
        [Required(ErrorMessage = "Phone number is required.")]
        public required string PhoneNumber { get; set; }
        [Required(ErrorMessage = "OTP code is required.")]
        public required string OtpCode { get; set; }
    }
}
