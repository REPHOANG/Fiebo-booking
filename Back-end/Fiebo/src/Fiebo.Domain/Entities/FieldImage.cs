using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class FieldImage
    {
        public required string Id { get; set; }

        public int FieldId { get; set; }

        public string? ImageUrl { get; set; }


        // Navigation
        public Field? Field { get; set; }
    }
}
