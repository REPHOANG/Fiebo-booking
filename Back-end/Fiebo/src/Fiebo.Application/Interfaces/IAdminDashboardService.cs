using Fiebo.Application.DTOs.AdminDashboard;
using System;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardResponse> GetDashboardAsync(DashboardRequest request);
    }
}
