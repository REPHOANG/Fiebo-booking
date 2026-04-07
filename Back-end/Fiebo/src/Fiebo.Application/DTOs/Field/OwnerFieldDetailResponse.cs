using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class OwnerFieldDetailResponse
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public int SportTypeId { get; set; }
        public List<string?> Images { get; set; } = [];
    }
}
