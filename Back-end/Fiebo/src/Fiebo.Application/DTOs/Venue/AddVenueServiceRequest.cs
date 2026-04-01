using Fiebo.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue;

public class AddVenueServiceRequest
{
    public int VenueId { get; set; }
    public string ServiceName { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public IFormFile? Image { get; set; } 
}