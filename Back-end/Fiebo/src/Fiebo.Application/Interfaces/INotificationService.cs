using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface INotificationService
    {
        Task NotifyWalletTopupAsync(string userId, decimal amount);
    }
}
