using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Report
{
    public class CreateReportRequest
    {
        public int BookingId { get; set; }
        public required string Title { get; set; }
        public required string Content { get; set; }
    }
}
