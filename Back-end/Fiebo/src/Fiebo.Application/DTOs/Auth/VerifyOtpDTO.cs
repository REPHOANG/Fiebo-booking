using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class VerifyOtpDTO
    {
        [EmailAddress]
        public string Email { get; set; } = null!;

        public string Otp { get; set; } = null!;
    }
}
