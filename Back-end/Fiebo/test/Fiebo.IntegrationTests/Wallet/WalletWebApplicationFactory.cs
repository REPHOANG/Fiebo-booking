using Fiebo.Application.Interfaces;
using Fiebo.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Fiebo.IntegrationTests.Wallet
{
    /// <summary>
    /// Extends <see cref="FieboWebApplicationFactory"/> to register
    /// <see cref="IWalletService"/> mock for wallet integration tests.
    /// </summary>
    public class WalletWebApplicationFactory : FieboWebApplicationFactory
    {
        public Mock<IWalletService> WalletServiceMock { get; } = new Mock<IWalletService>();

        protected override void RegisterMocks(IServiceCollection services)
        {
            services.AddScoped<IWalletService>(_ => WalletServiceMock.Object);
        }
    }
}
