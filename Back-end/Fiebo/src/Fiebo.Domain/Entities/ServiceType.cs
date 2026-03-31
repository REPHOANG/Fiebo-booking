using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class ServiceType 
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;   
        public string? Description { get; set; }
        public ICollection<VenueServiceItem> VenueServiceItems { get; set; } = [];
    }
}