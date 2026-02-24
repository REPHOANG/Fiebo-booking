using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class GoogleLoginRequest
    {
        [Required(ErrorMessage = "Google Token is required")]
        public string IdToken { get; set; } = null!;
    }
}
