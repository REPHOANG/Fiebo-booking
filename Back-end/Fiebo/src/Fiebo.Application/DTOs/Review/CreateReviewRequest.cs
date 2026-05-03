using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Review
{
    public class CreateReviewRequest
    {
        public int BookingId { get; set; }

        public string Rating { get; set; } = string.Empty;

        public string? Comment { get; set; }
        public List<IFormFile>? Images { get; set; }
    }
}
