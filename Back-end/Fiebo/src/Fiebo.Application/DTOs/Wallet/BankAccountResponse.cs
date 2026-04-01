namespace Fiebo.Application.DTOs.Wallet
{
    public class BankAccountResponse
    {
        public int Id { get; set; }
        public string BankName { get; set; } = null!;
        public string AccountNumber { get; set; } = null!;
        public string AccountHolderName { get; set; } = null!;
    }
}
