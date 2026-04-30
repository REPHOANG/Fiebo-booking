using Fiebo.Domain.Shared;

namespace Fiebo.Domain.Repositories
{
    public interface IAdminRepository
    {
        Task<PagedResult<CustomerResponse>> GetCustomersWithFilterAsync(CustomerFilter filter);
        Task<string> ResetFinanceAdminPasswordAsync(string userId);
    }
}