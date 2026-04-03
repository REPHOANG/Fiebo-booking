using Fiebo.Application.Interfaces;
using Fiebo.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Fiebo.IntegrationTests.TimeSlot
{
    public class TimeSlotWebApplicationFactory : FieboWebApplicationFactory
    {
        public Mock<ITimeSlotService> TimeSlotServiceMock { get; } = new Mock<ITimeSlotService>();
        public Mock<IVenueService> VenueServiceMock { get; } = new Mock<IVenueService>();
        public Mock<IFieldService> FieldServiceMock { get; } = new Mock<IFieldService>();

        protected override void RegisterMocks(IServiceCollection services)
        {
            services.AddScoped<ITimeSlotService>(_ => TimeSlotServiceMock.Object);
            services.AddScoped<IVenueService>(_ => VenueServiceMock.Object);
            services.AddScoped<IFieldService>(_ => FieldServiceMock.Object);
        }
    }
}
