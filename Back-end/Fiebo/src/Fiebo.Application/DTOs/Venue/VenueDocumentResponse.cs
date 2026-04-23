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
        public DateTime IssueDate { get; set; }

        public DateTime ExpiryDate { get; set; }

        public List<string> Images { get; set; } = [];
    }
}
