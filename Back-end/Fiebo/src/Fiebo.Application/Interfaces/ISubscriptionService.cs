using Fiebo.Application.DTOs.Subscription;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ISubscriptionService
    {
        Task<List<SubscriptionPlanResponse>> GetAvailablePlansAsync();
        Task<OwnerPlanResponse> SubscribeToPlanAsync(int planId, string ownerId);
    }
}
