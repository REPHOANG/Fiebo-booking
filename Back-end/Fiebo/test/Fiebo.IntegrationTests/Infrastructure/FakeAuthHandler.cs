using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Fiebo.IntegrationTests.Infrastructure
{
    /// <summary>
    /// A test-only <see cref="AuthenticationHandler{TOptions}"/> that authenticates
    /// any request carrying the <c>X-Test-UserId</c> header, injecting a
    /// <see cref="ClaimTypes.NameIdentifier"/> claim with its value.
    /// Requests without the header return <see cref="AuthenticateResult.NoResult"/>,
    /// preserving the real pipeline's 401 behaviour for unauthenticated scenarios.
    /// </summary>
    public class FakeAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        /// <summary>Header name used to pass the test user's ID to the handler.</summary>
        public const string UserIdHeaderName = "X-Test-UserId";

        /// <summary>Header name used to pass the test user's role(s) to the handler (comma-separated).</summary>
        public const string RoleHeaderName = "X-Test-Role";

        /// <summary>Name of the authentication scheme registered in tests.</summary>
        public const string SchemeName = "TestScheme";

        public FakeAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue(UserIdHeaderName, out var userIdValues))
                return Task.FromResult(AuthenticateResult.NoResult());

            var userId = userIdValues.ToString();
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userId) };

            // Optional role header for endpoints like [Authorize(Roles="...")]
            if (Request.Headers.TryGetValue(RoleHeaderName, out var roleValues))
            {
                var roles = roleValues.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
                foreach (var r in roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, r.Trim()));
                }
            }

            var identity  = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket    = new AuthenticationTicket(principal, SchemeName);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
