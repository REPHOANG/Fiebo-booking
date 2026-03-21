using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class OwnerVenueListResponse
    {
        public int VenueId { get; set; }
        public required string Name { get; set; }
        public required string ThumbnailUrl { get; set; }
        public required string Province { get; set; }
        public required string Ward { get; set; }
        public required string Status { get; set; }
        public int TotalFields { get; set; }
    }
}
