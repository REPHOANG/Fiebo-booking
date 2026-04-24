using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Report
{
    public class ReportDetailResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? ResponseContent { get; set; }
        public DateTime? RespondedAt { get; set; }
        public int Status { get; set; } // 0: Đang chờ, 1: Đã xử lý
    }
}
