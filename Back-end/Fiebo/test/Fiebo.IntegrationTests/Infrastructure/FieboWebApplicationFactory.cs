using Fiebo.API.Authorization;
using Fiebo.API.Middlewares;
using Fiebo.API.Wrappers;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.Infrastructure
{
    /// <summary>
    /// Base <see cref="WebApplicationFactory{TEntryPoint}"/> for all Fiebo integration
    /// test suites.
    /// <list type="bullet">
    ///   <item>Boots the real ASP.NET Core pipeline in-memory.</item>
    ///   <item>
    ///     Replaces JWT authentication with <see cref="FakeAuthHandler"/> so tests
    ///     do not need real tokens.
    ///   </item>
    ///   <item>
    ///     Exposes <see cref="CreateAuthenticatedClient"/> and
    ///     <see cref="CreateAnonymousClient"/> helpers that every test class can use.
    ///   </item>
    /// </list>
    /// Subclasses override <see cref="RegisterMocks"/> to inject their own
    /// service mocks via <c>IServiceCollection</c>.
    /// </summary>
    public abstract class FieboWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override IHost CreateHost(IHostBuilder builder)
        {
            var hostBuilder = new HostBuilder()
                .ConfigureWebHost(webHost =>
                {
                    webHost.UseEnvironment("Testing");
                    webHost.UseTestServer();

                    webHost.ConfigureServices(services =>
                    {
                        services.AddRouting();
                        services.AddControllers()
                            .AddApplicationPart(typeof(Program).Assembly);

                        services.Configure<ApiBehaviorOptions>(options =>
                        {
                            options.InvalidModelStateResponseFactory = actionContext =>
                            {
                                var errors = actionContext.ModelState
                                    .Where(e => e.Value?.Errors.Count > 0)
                                    .SelectMany(kvp => kvp.Value!.Errors)
                                    .Select(e => e.ErrorMessage)
                                    .ToList();

                                var errorMessage = string.Join(" ", errors);

                                var response = new ApiResponse<object>
                                {
                                    StatusCode = StatusCodes.Status400BadRequest,
                                    Message = errorMessage
                                };

                                return new BadRequestObjectResult(response);
                            };
                        });

                        services.AddAuthentication(options =>
                        {
                            options.DefaultAuthenticateScheme = FakeAuthHandler.SchemeName;
                            options.DefaultChallengeScheme = FakeAuthHandler.SchemeName;
                        })
                        .AddScheme<AuthenticationSchemeOptions, FakeAuthHandler>(
                            FakeAuthHandler.SchemeName, _ => { });

                        services.AddAuthorizationBuilder()
                            .AddPolicy("ActiveOwnerPlan", policy =>
                            {
                                policy.RequireAuthenticatedUser();
                                policy.RequireRole(AppRoles.FieldOwner);
                                policy.AddRequirements(new ActiveOwnerPlanRequirement(allowStaff: false));
                            })
                            .AddPolicy("ActiveOwnerOrStaffPlan", policy =>
                            {
                                policy.RequireAuthenticatedUser();
                                policy.RequireRole(AppRoles.FieldOwner, AppRoles.FieldStaff);
                                policy.AddRequirements(new ActiveOwnerPlanRequirement(allowStaff: true));
                            });

                        services.AddScoped<IAuthorizationHandler, TestActiveOwnerPlanHandler>();
                        services.AddSingleton<IAuthorizationMiddlewareResultHandler, OwnerPlanAuthorizationResultHandler>();

                        RegisterMocks(services);
                    });

                    webHost.Configure(app =>
                    {
                        app.UseRouting();
                        app.UseMiddleware<ExceptionHandlingMiddleware>();
                        app.UseAuthentication();
                        app.UseAuthorization();
                        app.UseEndpoints(endpoints => endpoints.MapControllers());
                    });
                });

            return hostBuilder.Start();
        }

        /// <summary>
        /// Override in a subclass to register service mocks into the DI container.
        /// Called inside <c>ConfigureTestServices</c>, so registrations here override
        /// the real application registrations.
        /// </summary>
        protected abstract void RegisterMocks(IServiceCollection services);

        // ─────────────────────────────────────────────────────────────────
        // Shared HttpClient helpers
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns an <see cref="HttpClient"/> that is authenticated as
        /// <paramref name="userId"/> via <see cref="FakeAuthHandler"/>,
        /// optionally with the specified <paramref name="roles"/>.
        /// </summary>
        public HttpClient CreateAuthenticatedClient(string userId, params string[] roles)
        {
            var client = CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            client.DefaultRequestHeaders.Add(FakeAuthHandler.UserIdHeaderName, userId);
            
            if (roles != null && roles.Length > 0)
            {
                client.DefaultRequestHeaders.Add(FakeAuthHandler.RoleHeaderName, string.Join(",", roles));
            }
            
            return client;
        }

        /// <summary>
        /// Returns a plain <see cref="HttpClient"/> with no authentication headers.
        /// Use this to test 401 / 403 guard scenarios.
        /// </summary>
        public HttpClient CreateAnonymousClient()
            => CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

        // ─────────────────────────────────────────────────────────────────
        // Shared JSON assertion helpers
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Reads the response body as a <see cref="System.Text.Json.JsonElement"/>.
        /// </summary>
        public static async Task<System.Text.Json.JsonElement> ReadJsonAsync(
            HttpResponseMessage response)
            => await response.Content
                .ReadFromJsonAsync<System.Text.Json.JsonElement>();
    }
}
