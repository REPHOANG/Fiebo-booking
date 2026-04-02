using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Owner
{
    public class OwnerCreateStaffRequest
    {
        [Required]
        [MinLength(1)]
        [MaxLength(50)]
        public required string FullName { get; set; }
        [Required]
        public required string Username { get; set; }
        [Required]
        [MinLength(6)]
        public required string Password { get; set; }

        public int VenueId { get; set; }
    }
}