using Fiebo.API.Authorization;
using Microsoft.AspNetCore.Authorization;

namespace Fiebo.IntegrationTests.Infrastructure
{
    public class TestActiveOwnerPlanHandler : AuthorizationHandler<ActiveOwnerPlanRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            ActiveOwnerPlanRequirement requirement)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }
    }
}
