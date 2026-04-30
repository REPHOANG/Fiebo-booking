using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class TopUpRequest
    {
        public int Id { get; set; }
        public int WalletId { get; set; }
        public Wallet Wallet { get; set; }
        public decimal Amount { get; set; }
        public TopUpStatus Status { get; set; } = TopUpStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? PaidAt { get; set; }
    }
}
