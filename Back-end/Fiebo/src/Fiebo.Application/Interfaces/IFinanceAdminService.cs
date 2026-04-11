using Fiebo.Application.DTOs.Admin;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IFinanceAdminService
    {
        Task<List<FinanceAdminListResponse>> GetFinanceAdminListAsync();
        Task<bool> CreateFinanceAdminAsync(CreateFinanceAdminRequest request);
    }
}
