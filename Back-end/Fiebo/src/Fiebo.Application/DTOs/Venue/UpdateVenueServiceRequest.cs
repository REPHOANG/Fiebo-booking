using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue;

public class UpdateVenueServiceRequest
{
    public string ServiceName { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }

    public int ServiceTypeId { get; set; }

    public IFormFile? Image { get; set; }
}