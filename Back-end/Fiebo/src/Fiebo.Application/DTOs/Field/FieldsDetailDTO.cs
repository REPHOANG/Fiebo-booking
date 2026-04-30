using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class FieldsDetailDTO
    {
        public required string Name { get; set; }

        public string? Description { get; set; }

        public string? SportType { get; set; }

        public List<string?> Images { get; set; } = [];
    }
}
