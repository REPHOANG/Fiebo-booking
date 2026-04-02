using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class CreateVenueResponse
    {
        [Required]
        public int VenueId { get; set; }

        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
