using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class TicketEventDetail
    {
        public int Id { get; set; }

        public int EventId { get; set; }
        public int FieldId { get; set; }
        public int SlotId { get; set; }

        public TicketEvent Event { get; set; } = null!;
        public Field Field { get; set; } = null!;
        public TimeSlot Slot { get; set; } = null!;
    }
}
