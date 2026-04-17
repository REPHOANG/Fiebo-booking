using Microsoft.AspNetCore.Authorization;

namespace Fiebo.API.Authorization
{
    public class ActiveOwnerPlanRequirement : IAuthorizationRequirement
    {
        public bool AllowStaff { get; }

        public ActiveOwnerPlanRequirement(bool allowStaff)
        {
            AllowStaff = allowStaff;
        }
    }
}
