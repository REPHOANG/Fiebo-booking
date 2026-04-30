using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Auth
{
    public class RegistrationRequest
    {
        [Required(ErrorMessage = "Full name is required")]
        [MinLength(4, ErrorMessage = "Full name must be at least 4 characters")]
        [MaxLength(100, ErrorMessage = "Full name must not exceed 100 characters")]
        public string FullName { get; set; } = null!;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(150, ErrorMessage = "Email must not exceed 150 characters")]
        public string Email { get; set; } = null!;

        [Phone(ErrorMessage = "Invalid phone number format")]
        public string PhoneNumber { get; set; } = null!;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = null!;

        [Required(ErrorMessage = "Confirm password is required")]
        [Compare("Password", ErrorMessage = "Password and confirm password do not match")]
        public string ConfirmPassword { get; set; } = null!;

        public DateOnly? DateOfBirth { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn loại tài khoản")]
        [RegularExpression("^(Customer|FieldOwner)$", ErrorMessage = "Loại tài khoản không hợp lệ. Chỉ chấp nhận 'Customer' hoặc 'FieldOwner'.")]
        public string Role { get; set; } = null!;
    }
}
