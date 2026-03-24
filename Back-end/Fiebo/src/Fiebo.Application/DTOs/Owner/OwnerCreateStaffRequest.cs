using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Owner
{
    public class OwnerCreateStaffRequest
    {
        public required string FullName { get; set; }
        public required string Username { get; set; }
        public required string Password { get; set; }

        public int VenueId { get; set; }
    }
}