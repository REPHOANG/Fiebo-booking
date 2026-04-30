using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.SportType
{
    public class UpdateSportTypeRequest
    {
        [Required]
        public required string Name { get; set; }
    }
}