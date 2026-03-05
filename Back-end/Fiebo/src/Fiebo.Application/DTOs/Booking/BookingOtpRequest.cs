using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class BookingOtpRequest
    {
        [Required, Phone]
        public required string PhoneNumber { get; set; }
    }
}
