using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class VenueDocumentResponse
    {
        public int DocumentId { get; set; }
        public DateTime IssueDate { get; set; }

        public DateTime ExpiryDate { get; set; }

        public List<DocumentImageDto> Images { get; set; } = [];
    }
    public class DocumentImageDto
    {
        public int ImageId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
    }
}
