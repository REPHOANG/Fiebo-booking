using Fiebo.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Identity
{
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = null!;
        public DateOnly? DateOfBirth { get; set; }
        public UserStatus Status { get; set; } = UserStatus.Inactive;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }

        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
    }
}