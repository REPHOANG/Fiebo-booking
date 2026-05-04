using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class CreateVenueRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required]
        public TimeOnly OpenTime { get; set; }

        [Required]
        public TimeOnly CloseTime { get; set; }
        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(100)]
        public string AddressDetail { get; set; } = null!;

        public int ProvinceId { get; set; }

        public int WardId { get; set; }

        public string Latitude { get; set; } = string.Empty;

        public string Longitude { get; set; } = string.Empty;

        public IFormFile? Thumbnail { get; set; }
    }
}
