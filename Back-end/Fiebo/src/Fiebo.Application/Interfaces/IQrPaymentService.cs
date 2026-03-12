using Fiebo.Application.DTOs.Wallet;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IQrPaymentService
    {
        QrPaymentResponseDto GenerateQrPayment(decimal amount, int topUpRequestId);
    }
}
