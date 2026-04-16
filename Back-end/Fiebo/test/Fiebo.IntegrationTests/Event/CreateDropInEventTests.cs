using Fiebo.Application.DTOs.Event;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.Event
{
    public class CreateDropInEventTests : IClassFixture<EventWebApplicationFactory>
    {
        private readonly EventWebApplicationFactory _factory;

        public CreateDropInEventTests(EventWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.EventServiceMock.Reset();
        }

        [Fact]
        public async Task CreateDropInEvent_AuthorizedOwner_Returns200()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            var request = ValidRequest();

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ReturnsAsync(88);

            var response = await client.PostAsJsonAsync("/api/owner/event", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Tạo sự kiện thành công.", json.GetProperty("message").GetString());
            Assert.Equal(88, json.GetProperty("data").GetProperty("eventId").GetInt32());

            _factory.EventServiceMock.Verify(s => s.CreateDropInEventAsync(
                It.Is<CreateDropInEventRequest>(r =>
                    r.Name == request.Name &&
                    r.EventDate == request.EventDate &&
                    r.PricePerPerson == request.PricePerPerson &&
                    r.MinPlayer == request.MinPlayer &&
                    r.MaxPlayer == request.MaxPlayer &&
                    r.Description == request.Description &&
                    r.Details.Count == 2 &&
                    r.Details[0].FieldId == 1 &&
                    r.Details[0].SlotId == 10 &&
                    r.Details[1].FieldId == 2 &&
                    r.Details[1].SlotId == 11),
                ownerId),
                Times.Once);
        }

        [Fact]
        public async Task CreateDropInEvent_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateDropInEvent_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateDropInEvent_InvalidModelBoundary_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var invalidPayload = new
            {
                Name = "Event",
                EventDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Details = new[] { new { FieldId = 1, SlotId = 10 } },
                PricePerPerson = 0,
                MinPlayer = 0,
                MaxPlayer = 0,
                Description = "Boundary invalid values"
            };

            var response = await client.PostAsJsonAsync("/api/owner/event", invalidPayload);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateDropInEvent_MaxPlayerSmallerThanMinPlayer_Returns400()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

            var request = new CreateDropInEventRequest
            {
                Name = "Invalid max/min event",
                EventDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Details =
                [
                    new CreateDropInEventDetailRequest { FieldId = 1, SlotId = 10 }
                ],
                PricePerPerson = 100000,
                MinPlayer = 10,
                MaxPlayer = 5,
                Description = "Max is smaller than min"
            };

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ThrowsAsync(new BadRequestException("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu."));

            var response = await client.PostAsJsonAsync("/api/owner/event", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.CreateDropInEventAsync(
                    It.Is<CreateDropInEventRequest>(r => r.MinPlayer == 10 && r.MaxPlayer == 5),
                    ownerId),
                Times.Once);
        }

        [Fact]
        public async Task CreateDropInEvent_InvalidBody_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var response = await client.PostAsync("/api/owner/event", new StringContent("{", System.Text.Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateDropInEvent_ServiceBadRequest_Returns400()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ThrowsAsync(new BadRequestException("Số người tối thiểu phải lớn hơn 0."));

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CreateDropInEvent_ServiceConflict_Returns409()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ThrowsAsync(new ResourceConflictException("Sân đã được đặt."));

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task CreateDropInEvent_ServiceNotFound_Returns404()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ThrowsAsync(new NotFoundException("Không tìm thấy sân."));

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CreateDropInEvent_ServiceUnauthorizedAccess_Returns401()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.CreateDropInEventAsync(It.IsAny<CreateDropInEventRequest>(), ownerId))
                .ThrowsAsync(new UnauthorizedAccessException("Bạn không có quyền tạo sự kiện cho sân này."));

            var response = await client.PostAsJsonAsync("/api/owner/event", ValidRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private static CreateDropInEventRequest ValidRequest()
        {
            return new CreateDropInEventRequest
            {
                Name = "Friendly Match",
                EventDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                PricePerPerson = 120000,
                MinPlayer = 8,
                MaxPlayer = 12,
                Description = "Evening football event",
                Details =
                [
                    new CreateDropInEventDetailRequest { FieldId = 1, SlotId = 10 },
                    new CreateDropInEventDetailRequest { FieldId = 2, SlotId = 11 }
                ]
            };
        }
    }
}
