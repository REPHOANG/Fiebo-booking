using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTOs.Field
{
    public class FieldsDetailDTO
    {
        public required string Name { get; set; }

        public double AverageRating { get; set; } = 0;

        public string? Description { get; set; }

        public string? SportType { get; set; }

        public List<string?> Images { get; set; } = [];

        public List<ReviewDTO> Reviews { get; set; } = [];

    }
}
