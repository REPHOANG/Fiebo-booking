using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue;

public class GetVenueServicesRequest
{
    public string? SearchKeyword { get; set; }
    public int? ServiceTypeId { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}