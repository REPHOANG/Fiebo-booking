using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Wallet
    {
        [Key]
        public int WalletId { get; set; }

        public decimal Balance { get; set; }

        public bool Status { get; set; }

        /* FK */
        public int UserId { get; set; }

        public User User { get; set; } = null!;
    }
}
