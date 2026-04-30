using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Wallet
{
    public class CreateBankAccountRequest
    {
        [Required(ErrorMessage = "Tên ngân hàng là bắt buộc.")]
        public string BankName { get; set; } = null!;

        [Required(ErrorMessage = "Số tài khoản là bắt buộc.")]
        public string AccountNumber { get; set; } = null!;

        [Required(ErrorMessage = "Tên chủ tài khoản là bắt buộc.")]
        public string AccountHolderName { get; set; } = null!;
    }
}
