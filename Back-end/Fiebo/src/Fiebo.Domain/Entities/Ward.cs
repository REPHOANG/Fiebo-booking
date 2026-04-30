using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Ward
    {
        public int Id { get; set; }

        public required string Name { get; set; }

        public int ProvinceId { get; set; }


        // Navigation
        public Province Province { get; set; } = null!;

        public ICollection<Venue>? Venues { get; set; }
    }
}
