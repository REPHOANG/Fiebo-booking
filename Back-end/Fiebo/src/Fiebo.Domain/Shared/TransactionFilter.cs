using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Shared
{
    public class TransactionFilter
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Status { get; set; }
        public string? Name { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}
