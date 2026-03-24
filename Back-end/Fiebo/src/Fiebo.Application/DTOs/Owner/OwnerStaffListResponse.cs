using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Owner
{
    public class OwnerStaffListResponse
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = null!;
        public List<OwnerStaffMemberDto> Staffs { get; set; } = [];
    }
}