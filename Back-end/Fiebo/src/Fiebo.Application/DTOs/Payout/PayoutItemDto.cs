using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Payout
{
    public class PayoutItemDto
    {
        public int RefId { get; set; }
        public string OwnerId { get; set; }
        public decimal Amount { get; set; }
        public PayoutDetailType Type { get; set; }
    }
}
