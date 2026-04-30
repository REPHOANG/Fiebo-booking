using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class WithdrawRequest
    {
        [Required(ErrorMessage = "Số tiền rút là bắt buộc.")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Tài khoản ngân hàng là bắt buộc.")]
        public int BankAccountId { get; set; }
    }
}
