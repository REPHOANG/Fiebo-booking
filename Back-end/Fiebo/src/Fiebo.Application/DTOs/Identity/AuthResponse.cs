using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Identity
{
    public class AuthResponse
    {
        public string Token { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Message { get; set; }
        public bool IsSuccess { get; set; }
    }
}
