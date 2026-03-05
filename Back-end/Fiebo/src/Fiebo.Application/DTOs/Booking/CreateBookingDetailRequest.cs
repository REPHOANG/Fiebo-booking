using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Booking
{
    public class CreateBookingDetailRequest
    {
        public int FieldId { get; set; }

        public int SlotId { get; set; }
    }
}
