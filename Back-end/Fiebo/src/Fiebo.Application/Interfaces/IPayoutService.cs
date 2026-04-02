using Fiebo.Application.DTOs.Payout;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IPayoutService
    {
        Task<PagedResult<OwnerPayoutsResponse>> GetOwnerPayoutsAsync(string? ownerId, int page, int pageSize);
    }
}
