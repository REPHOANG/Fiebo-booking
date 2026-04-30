using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class UserProfileRequest
    {
        [MinLength(4, ErrorMessage = "Full name must be at least 4 characters")]
        public string? FullName { get; set; }
        [Phone(ErrorMessage = "Invalid format of phone number")]
        public string? PhoneNumber { get; set; }
        [DataType(DataType.Date, ErrorMessage = "Invalid format of date")]
        public DateOnly? DateOfBirth { get; set; }
    }
}
