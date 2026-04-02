using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class UserBankAccount : BaseEntity
    {
        public required string UserId { get; set; }
        public required string BankName { get; set; }
        public required string AccountNumber { get; set; }
        public required string AccountHolderName { get; set; }
    }
}
