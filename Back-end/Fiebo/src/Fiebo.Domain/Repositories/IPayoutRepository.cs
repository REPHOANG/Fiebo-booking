using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IPayoutRepository : IRepository<Payout>
    {
        Task<PagedResult<Payout>> GetOwnerPayouts(string? ownerId, int page, int pageSize);
    }
}
