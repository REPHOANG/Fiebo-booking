using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace Fiebo.Domain.Entities
{
    public class VenueDocument
    {
        public int Id { get; set; } 
        public int VenueId { get; set; }

        public DocumentType DocumentType { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime ExpiryDate { get; set; }

        public DocumentStatus Status { get; set; }
        public bool IsActive { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        public Venue Venue { get; set; }
        public ICollection<VenueDocumentImage> Images { get; set; }
    }
}
