using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class SportType
    {
        public int Id { get; set; }

        public required string Name { get; set; }

        // Navigation
        public ICollection<Field>? Fields { get; set; }
        public ICollection<TimeSlot> TimeSlots { get; set; } = [];
    }
}
