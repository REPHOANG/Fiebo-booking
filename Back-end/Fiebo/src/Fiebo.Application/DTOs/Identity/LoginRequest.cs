using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Identity
{
    public class LoginRequest
    {
        [Required]
        public string EmailOrPhone { get; set; } = null!;
        [Required]
        public string Password { get; set; } = null!;
    }
}
