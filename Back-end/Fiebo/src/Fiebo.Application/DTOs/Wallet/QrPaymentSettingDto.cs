using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Wallet
{
    public class QrPaymentSettingDto
    {
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public string QrBaseUrl { get; set; }
        public string Template { get; set; }
    }
}
