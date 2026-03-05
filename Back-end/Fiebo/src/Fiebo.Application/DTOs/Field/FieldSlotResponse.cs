using Fiebo.Application.DTOs.Slot;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class FieldSlotResponse
    {
        public int FieldId { get; set; }

        public string FieldName { get; set; } = null!;

        public List<UnavailableSlotResponse> UnavailableSlots { get; set; } = [];
    }
}
