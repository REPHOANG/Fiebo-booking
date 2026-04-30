using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Report
{
    public class RespondReportRequest
    {
        public int ReportId { get; set; }
        public required string ResponseContent { get; set; }
    }
}
