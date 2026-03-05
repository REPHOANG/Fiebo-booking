using Fiebo.Application.DTOs.Slot;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class SportTypeSlotResponse
    {
        public int SportTypeId { get; set; }

        public string SportTypeName { get; set; } = null!;

        public List<SlotResponse> Slots { get; set; } = [];

        public List<FieldSlotResponse> Fields { get; set; } = [];
    }
}
