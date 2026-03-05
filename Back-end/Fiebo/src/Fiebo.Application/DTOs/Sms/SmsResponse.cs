using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Sms
{
    public class SmsResponse
    {
        public string Status { get; set; } = null!;
        public string Message { get; set; } = null!;
    }
}
