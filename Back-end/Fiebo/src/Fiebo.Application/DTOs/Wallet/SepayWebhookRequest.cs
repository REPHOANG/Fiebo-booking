using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class SepayWebhookRequest
    {
        public long Id { get; set; }

        public string Gateway { get; set; } = string.Empty;

        public string TransactionDate { get; set; } = string.Empty;

        public string AccountNumber { get; set; } = string.Empty;

        public string? Code { get; set; }

        public string Content { get; set; } = string.Empty;

        public string TransferType { get; set; } = string.Empty;

        public decimal TransferAmount { get; set; }

        public decimal Accumulated { get; set; }

        public string? SubAccount { get; set; }

        public string ReferenceCode { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}
