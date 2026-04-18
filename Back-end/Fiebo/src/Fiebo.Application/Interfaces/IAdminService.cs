using Fiebo.Application.DTOs.Admin;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IAdminService
    {
        Task<PagedResult<CustomerResponse>> GetCustomerListAsync(CustomerFilter filter);
        Task<string> ResetFinanceAdminPasswordAsync(string userId);
        Task<PagedResult<OwnerListResponse>> GetOwnerListAsync(OwnerListRequest request);
    }
}
