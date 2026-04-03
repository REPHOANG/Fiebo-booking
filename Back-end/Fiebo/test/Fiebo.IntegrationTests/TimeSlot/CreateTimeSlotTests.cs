using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.TimeSlot
{
    public class CreateTimeSlotTests : IClassFixture<TimeSlotWebApplicationFactory>
    {
        private readonly TimeSlotWebApplicationFactory _factory;

        public CreateTimeSlotTests(TimeSlotWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.TimeSlotServiceMock.Reset();
            _factory.VenueServiceMock.Reset();
            _factory.FieldServiceMock.Reset();
        }

        [Fact]
        public async Task CreateTimeSlot_AuthorizedOwner_Returns200WithData()
        {
            ResetMocks();
            const int venueId = 10;
            const string ownerId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            var request = ValidCreateRequest();
            var responseDto = new VenueTimeSlotDto
            {
                Id = 99,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                DayOfWeek = "Monday",
                Price = 150000m
            };

            _factory.TimeSlotServiceMock
                .Setup(s => s.CreateVenueTimeSlotAsync(venueId, It.IsAny<CreateVenueTimeSlotRequest>(), ownerId))
                .ReturnsAsync(responseDto);

            var response = await client.PostAsJsonAsync($"/api/owner/venue/{venueId}/time-slot", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Tạo khung giờ sân thành công", json.GetProperty("message").GetString());
            Assert.Equal(99, json.GetProperty("data").GetProperty("id").GetInt32());

            _factory.TimeSlotServiceMock.Verify(s => s.CreateVenueTimeSlotAsync(
                venueId,
                It.Is<CreateVenueTimeSlotRequest>(r =>
                    r.SportTypeId == 1 &&
                    r.StartTime == new TimeOnly(10, 0) &&
                    r.EndTime == new TimeOnly(11, 0) &&
                    r.DayOfWeek == "Monday" &&
                    r.Price == 150000m),
                ownerId), Times.Once);
        }

        [Fact]
        public async Task CreateTimeSlot_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();

            var response = await client.PostAsJsonAsync("/api/owner/venue/10/time-slot", ValidCreateRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.CreateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<CreateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateTimeSlot_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("admin-1", AppRoles.Admin);

            var response = await client.PostAsJsonAsync("/api/owner/venue/10/time-slot", ValidCreateRequest());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.CreateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<CreateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateTimeSlot_InvalidModel_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var payload = new
            {
                SportTypeId = 1,
                StartTime = "10:00:00",
                EndTime = "11:00:00",
                Price = 150000
            };

            var response = await client.PostAsJsonAsync("/api/owner/venue/10/time-slot", payload);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.CreateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<CreateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateTimeSlot_ServiceBadRequest_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.TimeSlotServiceMock
                .Setup(s => s.CreateVenueTimeSlotAsync(10, It.IsAny<CreateVenueTimeSlotRequest>(), "owner-1"))
                .ThrowsAsync(new BadRequestException("Khung giờ tối thiểu là 30 phút"));

            var response = await client.PostAsJsonAsync("/api/owner/venue/10/time-slot", ValidCreateRequest());

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        private static CreateVenueTimeSlotRequest ValidCreateRequest()
        {
            return new CreateVenueTimeSlotRequest
            {
                SportTypeId = 1,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                DayOfWeek = "Monday",
                Price = 150000m
            };
        }
    }
}
