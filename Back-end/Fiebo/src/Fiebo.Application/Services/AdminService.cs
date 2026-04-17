using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _unitOfWork;
        public AdminService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        public async Task<PagedResult<CustomerResponse>> GetCustomerListAsync(CustomerFilter filter)
        {
            if (filter.PageNumber <= 0) filter.PageNumber = 1;
            if (filter.PageSize <= 0) filter.PageSize = 10;

            var result = await _unitOfWork.Admins.GetCustomersWithFilterAsync(filter);

            return result;
        }
        public async Task<string> ResetFinanceAdminPasswordAsync(string userId)
        {
            var newPass = await _unitOfWork.Admins.ResetFinanceAdminPasswordAsync(userId);
            return newPass;
        }
    }
}
