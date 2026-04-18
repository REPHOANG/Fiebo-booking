using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Admin
{
    public class OwnerListResponse
    {
        public string Id { get; set; } = default!;
        public string OwnerName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;

        public int TotalVenues { get; set; }
        public int TotalFields { get; set; }
    }
}
