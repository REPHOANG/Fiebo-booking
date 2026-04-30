using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class VenueDocumentImage
    {
        public int Id { get; set; } 
        public int DocumentId { get; set; }

        public string ImageUrl { get; set; }

        // Navigation property
        public VenueDocument Document { get; set; }
    }
}
