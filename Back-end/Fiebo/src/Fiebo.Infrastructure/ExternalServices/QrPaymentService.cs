using CloudinaryDotNet;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class QrPaymentService : IQrPaymentService
    {
        private readonly IConfiguration _configuration;

        public QrPaymentService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public QrPaymentResponseDto GenerateQrPayment(decimal amount, int topUpId)
        {
            var bankName = _configuration["QrPayment:BankName"] ?? "";
            var accountName = _configuration["QrPayment:AccountName"] ?? "";
            var accountNumber = _configuration["QrPayment:AccountNumber"] ?? "";
            var qrBaseUrl = _configuration["QrPayment:QrBaseUrl"] ?? "";
            var template = _configuration["QrPayment:Template"] ?? "";
            var prefix = _configuration["QrPayment:DescriptionPrefix"] ?? "";
            var transferContent = $"{prefix}{topUpId}";
            return new QrPaymentResponseDto
            {
                BankName = bankName,
                AccountName = accountName,
                AccountNumber = accountNumber,
                Amount = amount,
                TransferContent = transferContent,
                QrImageUrl = $"{qrBaseUrl}?bank={bankName}&acc={accountNumber}&template={template}&amount={amount}&des={transferContent}"
            };
        }
    }
}
