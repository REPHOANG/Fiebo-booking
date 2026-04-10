using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Admin
{
    public class FinanceAdminListResponse
    {
        public required string AdminId { get; set; }
        public required string FullName { get; set; }
        public required string Username { get; set; }
        public required string Status { get; set; }
    }
}
