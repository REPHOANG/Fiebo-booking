using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class UpdateVenueDocumentRequest
    {
        public DateTime IssueDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public List<int> DeletedImageIds { get; set; } = [];
        public List<IFormFile> NewImages { get; } = [];
    }
}
