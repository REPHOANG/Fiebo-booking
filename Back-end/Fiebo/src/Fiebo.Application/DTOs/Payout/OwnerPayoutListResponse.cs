using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Payout
{
    public class OwnerPayoutListResponse
    {
        public decimal PendingPayout { get; set; }
        public DateTime? NextPayout { get; set; }
        public PagedResult<OwnerPayoutsResponse> Payouts { get; set; } = new PagedResult<OwnerPayoutsResponse>();
    }
}
