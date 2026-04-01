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

        public Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName)
        {
            _logger.LogInformation(
                "[MOCK PAYOUT] Processing payout — TransactionId: {TxId}, Amount: {Amount}, Bank: {Bank}, Account: {Account}, Holder: {Holder}",
                transactionId, amount, bankName, accountNumber, accountHolderName);

            // In production, this would call a real payment gateway API here.
            return Task.FromResult(true);
        }
    }
}
