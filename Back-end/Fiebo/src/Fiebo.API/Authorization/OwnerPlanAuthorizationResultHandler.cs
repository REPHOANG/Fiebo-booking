using Fiebo.API.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace Fiebo.API.Authorization
{
    public class OwnerPlanAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
    {
        private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

        public async Task HandleAsync(
            RequestDelegate next,
            HttpContext context,
            AuthorizationPolicy policy,
            PolicyAuthorizationResult authorizeResult)
        {
            if (authorizeResult.Forbidden && authorizeResult.AuthorizationFailure != null)
            {
                var hasOwnerPlanRequirement = authorizeResult.AuthorizationFailure.FailedRequirements
                    .OfType<ActiveOwnerPlanRequirement>()
                    .Any();

                if (hasOwnerPlanRequirement)
                {
                    var message = authorizeResult.AuthorizationFailure.FailureReasons.FirstOrDefault()?.Message
                        ?? "Bạn không có quyền truy cập tài nguyên này.";

                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";

                    await context.Response.WriteAsJsonAsync(new ApiResponse<object>
                    {
                        StatusCode = StatusCodes.Status403Forbidden,
                        Message = message,
                        Data = null
                    });
                    return;
                }
            }

            await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
        }
    }
}
