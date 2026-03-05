using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class VerifyBookingOtpRequest
    {
        [Required]
        public required string Fullname { get; set; }
        [Required, Phone]
        public required string PhoneNumber { get; set; }
        [Required]
        public required string OtpCode { get; set; }
    }
}
