using Fiebo.Application.Interfaces;
using Fiebo.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Fiebo.IntegrationTests.Field
{
    public class FieldWebApplicationFactory : FieboWebApplicationFactory
    {
        public Mock<IFieldService> FieldServiceMock { get; } = new Mock<IFieldService>();
        public Mock<IVenueService> VenueServiceMock { get; } = new Mock<IVenueService>();
        public Mock<ITimeSlotService> TimeSlotServiceMock { get; } = new Mock<ITimeSlotService>();

        protected override void RegisterMocks(IServiceCollection services)
        {
            services.AddScoped<IFieldService>(_ => FieldServiceMock.Object);
            services.AddScoped<IVenueService>(_ => VenueServiceMock.Object);
            services.AddScoped<ITimeSlotService>(_ => TimeSlotServiceMock.Object);
        }
    }
}
