using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Slot
{
    public class UnavailableSlotResponse
    {
        public int? EventId { get; set; }
        public int SlotId { get; set; }

        public string Status { get; set; } = null!;
    }
}
