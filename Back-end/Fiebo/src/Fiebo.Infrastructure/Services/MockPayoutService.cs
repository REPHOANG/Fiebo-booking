using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Services
{
    public class MockPayoutService : IPayoutService
    {
        private readonly ILogger<MockPayoutService> _logger;

        public MockPayoutService(ILogger<MockPayoutService> logger)
        {
            _logger = logger;
        }

        public async Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName)
        {
            _logger.LogInformation(
                "[MOCK PAYOUT] Starting payout processing — TransactionId: {TxId}, Amount: {Amount}",
                transactionId, amount);

            // Simulate network latency
            await Task.Delay(2000);

            _logger.LogInformation(
                "[MOCK PAYOUT] Payout completed successfully — TransactionId: {TxId}, Bank: {Bank}, Account: {Account}",
                transactionId, bankName, accountNumber);

            // In production, this would call a real payment gateway API here.
            return true;
        }
    }
}
