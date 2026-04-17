using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class UserProfileServiceResponse
    {
        public string Id { get; set; } = null!;
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Roles { get; set; }
        public string? Status { get; set; }
        public bool? HasSubscription { get; set; }
        public bool? HasBankAccount { get; set; }
    }
}
