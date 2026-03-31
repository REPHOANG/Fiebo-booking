using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Venue
{
    public class UpdateVenueDocumentDto
    {
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public List<IFormFile>? Images { get; set; } = new List<IFormFile>();
    }
}
