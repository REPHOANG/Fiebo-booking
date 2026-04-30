

namespace Fiebo.Domain.Entities
{
    public class Wallet
    {
        public int Id { get; set; }

        public decimal Balance { get; set; } = 0; // Số dư mặc định = 0

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public string UserId { get; set; } = null!;

        public DateTime RowVersion { get; set; }

        public ICollection<TopUpRequest> TopUpRequests { get; set; } = [];

        public ICollection<WalletTransaction> Transactions { get; set; } = [];
    }
}
