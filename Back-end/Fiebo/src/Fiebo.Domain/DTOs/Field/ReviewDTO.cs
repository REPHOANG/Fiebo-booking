using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.DTOs.Field
{
    public class ReviewDTO
    {
        public string? Name { get; set; }
        public DateTime Time { get; set; } 
        public string? Comment { get; set; }
        public double Rating { get; set; } = 0;
    }
}
