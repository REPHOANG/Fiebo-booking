using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
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
        public readonly IIdentityService _identityService;
        public AdminService(IUnitOfWork unitOfWork, IIdentityService identityService)
        {
            _unitOfWork = unitOfWork;
            _identityService = identityService;
        }
        public async Task<PagedResult<CustomerResponse>> GetCustomerListAsync(CustomerFilter filter)
        {
            if (filter.PageNumber <= 0) filter.PageNumber = 1;
            if (filter.PageSize <= 0) filter.PageSize = 10;

            var result = await _unitOfWork.Admins.GetCustomersWithFilterAsync(filter);

            return result;
        }

        public async Task<PagedResult<OwnerListResponse>> GetOwnerListAsync(OwnerListRequest request)
        {
            var owners = await _identityService.GetOwnersAsync(request.Page, request.PageSize, request.From, request.To);
            return owners;
        }

        public async Task<string> ResetFinanceAdminPasswordAsync(string userId)
        {
            var newPass = await _unitOfWork.Admins.ResetFinanceAdminPasswordAsync(userId);
            return newPass;
        }
    }
}
