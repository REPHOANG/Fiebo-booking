using Fiebo.Application.Interfaces;
using Fiebo.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Fiebo.IntegrationTests.Booking
{
    public class BookingWebApplicationFactory : FieboWebApplicationFactory
    {
        public Mock<IBookingService> BookingServiceMock { get; } = new Mock<IBookingService>();

        protected override void RegisterMocks(IServiceCollection services)
        {
            services.AddScoped<IBookingService>(_ => BookingServiceMock.Object);
        }
    }
}