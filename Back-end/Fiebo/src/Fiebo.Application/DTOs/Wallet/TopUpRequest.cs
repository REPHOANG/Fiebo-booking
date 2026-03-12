using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class TopUpRequest
    {
        [Required]
        [Range(10000, 1000000, ErrorMessage = "Amount must be between 10,000 and 1,000,000.")]
        public decimal Amount { get; set; }
    }
}
