using Fiebo.Application.DTOs.Admin;
using Fiebo.Domain.Shared;
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
        Task<PagedResult<PaymentTransactionResponse>> GetPaymentTransactionAsync(int page, int pageSize, TransactionFilter filter);
    }
}
