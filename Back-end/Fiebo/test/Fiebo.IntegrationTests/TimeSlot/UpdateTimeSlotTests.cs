using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.TimeSlot
{
    public class UpdateTimeSlotTests : IClassFixture<TimeSlotWebApplicationFactory>
    {
        private readonly TimeSlotWebApplicationFactory _factory;

        public UpdateTimeSlotTests(TimeSlotWebApplicationFactory factory)
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
        public async Task UpdateTimeSlot_AuthorizedOwner_Returns200WithData()
        {
            ResetMocks();
            const int timeSlotId = 55;
            const string ownerId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            var request = ValidUpdateRequest();

            _factory.TimeSlotServiceMock
                .Setup(s => s.UpdateVenueTimeSlotAsync(timeSlotId, It.IsAny<UpdateVenueTimeSlotRequest>(), ownerId))
                .ReturnsAsync(new VenueTimeSlotDto
                {
                    Id = 88,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    DayOfWeek = "Monday",
                    Price = request.Price
                });

            var response = await client.PutAsJsonAsync($"/api/owner/time-slots/{timeSlotId}", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Cập nhật khung giờ sân thành công", json.GetProperty("message").GetString());
            Assert.Equal(88, json.GetProperty("data").GetProperty("id").GetInt32());

            _factory.TimeSlotServiceMock.Verify(s => s.UpdateVenueTimeSlotAsync(
                timeSlotId,
                It.Is<UpdateVenueTimeSlotRequest>(r =>
                    r.StartTime == request.StartTime &&
                    r.EndTime == request.EndTime &&
                    r.Price == request.Price),
                ownerId), Times.Once);
        }

        [Fact]
        public async Task UpdateTimeSlot_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", ValidUpdateRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.UpdateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<UpdateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task UpdateTimeSlot_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("admin-1", AppRoles.Admin);

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", ValidUpdateRequest());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.UpdateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<UpdateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task UpdateTimeSlot_InvalidModel_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var payload = new
            {
                StartTime = "invalid-time",
                EndTime = "11:30:00",
                Price = 180000
            };

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", payload);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.UpdateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<UpdateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task UpdateTimeSlot_InvalidPrice_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var payload = new
            {
                StartTime = "10:30:00",
                EndTime = "11:30:00",
                Price = -1
            };

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", payload);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.UpdateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<UpdateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task UpdateTimeSlot_ServiceBadRequest_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.TimeSlotServiceMock
                .Setup(s => s.UpdateVenueTimeSlotAsync(55, It.IsAny<UpdateVenueTimeSlotRequest>(), "owner-1"))
                .ThrowsAsync(new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc"));

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", ValidUpdateRequest());

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task UpdateTimeSlot_ServiceNotFound_Returns404()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.TimeSlotServiceMock
                .Setup(s => s.UpdateVenueTimeSlotAsync(404, It.IsAny<UpdateVenueTimeSlotRequest>(), "owner-1"))
                .ThrowsAsync(new NotFoundException("Không tìm thấy khung giờ"));

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/404", ValidUpdateRequest());

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task UpdateTimeSlot_OverlapSlot_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.TimeSlotServiceMock
                .Setup(s => s.UpdateVenueTimeSlotAsync(55, It.IsAny<UpdateVenueTimeSlotRequest>(), "owner-1"))
                .ThrowsAsync(new BadRequestException("Khung giờ này đang bị trùng với khung giờ hiện có."));

            var response = await client.PutAsJsonAsync("/api/owner/time-slots/55", ValidUpdateRequest());

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task UpdateTimeSlot_InvalidBody_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var response = await client.PutAsync("/api/owner/time-slots/55", new StringContent("{", System.Text.Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.TimeSlotServiceMock.Verify(
                s => s.UpdateVenueTimeSlotAsync(It.IsAny<int>(), It.IsAny<UpdateVenueTimeSlotRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        private static UpdateVenueTimeSlotRequest ValidUpdateRequest()
        {
            return new UpdateVenueTimeSlotRequest
            {
                StartTime = new TimeOnly(10, 30),
                EndTime = new TimeOnly(11, 30),
                Price = 180000m
            };
        }
    }
}
