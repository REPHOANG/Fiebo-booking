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

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public IFormFile? Thumbnail { get; set; }
    }
}
