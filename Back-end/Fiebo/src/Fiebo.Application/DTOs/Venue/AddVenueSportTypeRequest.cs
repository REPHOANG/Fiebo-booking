using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class AddVenueSportTypeRequest
    {
        [Required]
        public required List<int> SportTypeIds { get; set; }
    }
}
