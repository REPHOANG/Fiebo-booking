using Fiebo.Application.DTOs.Report;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IReportService
    {
        Task<bool> SendReportAsync(string userId, CreateReportRequest request);
        Task<bool> RespondToReportAsync(string adminId, RespondReportRequest request);
        Task<IEnumerable<ReportSummaryResponse>> GetAllReportsForAdminAsync();
        Task<ReportDetailResponse> GetReportDetailForCustomerAsync(int reportId, string userId);
    }
}
