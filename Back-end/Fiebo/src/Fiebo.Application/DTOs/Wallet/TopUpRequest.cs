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

        public decimal Amount { get; set; }
    }
}
