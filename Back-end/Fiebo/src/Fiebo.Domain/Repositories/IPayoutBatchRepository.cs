using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IPayoutBatchRepository : IRepository<PayoutBatch>
    {
        Task<PagedResult<PayoutBatch>> GetPayoutBatchesAsync(int page, int pageSize, int? year, int? month, PayoutStatus? status);
        Task<bool> StartProcessingBatchAsync(int batchId, string processedBy);
        Task<bool> MarkBatchAsCompletedAsync(int batchId, string processedBy);
    }
}
