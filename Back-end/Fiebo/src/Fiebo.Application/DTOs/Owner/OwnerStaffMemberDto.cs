using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Owner
{
    public class OwnerStaffMemberDto
    {
        public string StaffId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Username { get; set; } = null!;
    }
}