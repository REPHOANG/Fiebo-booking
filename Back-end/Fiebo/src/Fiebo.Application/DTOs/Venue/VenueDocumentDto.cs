using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class VenueDocumentDto
    {
        [Required]
        public DateTime IssueDate { get; set; }

        [Required]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public List<IFormFile> Images { get; set; } = [];
    }
}
