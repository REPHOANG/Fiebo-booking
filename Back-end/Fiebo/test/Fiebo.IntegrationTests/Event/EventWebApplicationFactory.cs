using Fiebo.Application.Interfaces;
using Fiebo.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Fiebo.IntegrationTests.Event
{
    public class EventWebApplicationFactory : FieboWebApplicationFactory
    {
        public Mock<IEventService> EventServiceMock { get; } = new Mock<IEventService>();

        protected override void RegisterMocks(IServiceCollection services)
        {
            services.AddScoped<IEventService>(_ => EventServiceMock.Object);
        }
    }
}
