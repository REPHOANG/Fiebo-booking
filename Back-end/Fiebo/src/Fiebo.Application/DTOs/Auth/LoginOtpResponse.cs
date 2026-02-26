using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class LoginOtpResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = null!;
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string AccessToken { get; set; } = null!;
    }
}
