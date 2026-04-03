using Fiebo.Application.DTOs.Event;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.Event
{
    public class JoinDropInEventTests : IClassFixture<EventWebApplicationFactory>
    {
        private readonly EventWebApplicationFactory _factory;

        public JoinDropInEventTests(EventWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.EventServiceMock.Reset();
        }

        [Fact]
        public async Task JoinDropInEvent_AuthorizedCustomer_Returns200()
        {
            ResetMocks();
            const int eventId = 10;
            const string userId = "customer-1";

            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.Customer);
            var request = ValidRequest();

            _factory.EventServiceMock
                .Setup(s => s.JoinDropInEventAsync(It.IsAny<JoinEventRequest>(), eventId, userId))
                .ReturnsAsync(99);

            var response = await client.PostAsJsonAsync($"/api/Event/{eventId}/join", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Tham gia đặt sân thành công.", json.GetProperty("message").GetString());
            Assert.Equal(99, json.GetProperty("data").GetProperty("ticketParticipantId").GetInt32());

            _factory.EventServiceMock.Verify(s => s.JoinDropInEventAsync(
                It.Is<JoinEventRequest>(r =>
                    r.Fullname == request.Fullname &&
                    r.PhoneNumber == request.PhoneNumber &&
                    r.TicketQuantity == request.TicketQuantity),
                eventId,
                userId), Times.Once);
        }

        [Fact]
        public async Task JoinDropInEvent_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();

            var response = await client.PostAsJsonAsync("/api/Event/10/join", ValidRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.JoinDropInEventAsync(It.IsAny<JoinEventRequest>(), It.IsAny<int>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task JoinDropInEvent_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            var response = await client.PostAsJsonAsync("/api/Event/10/join", ValidRequest());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.JoinDropInEventAsync(It.IsAny<JoinEventRequest>(), It.IsAny<int>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task JoinDropInEvent_InvalidModel_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

            var invalidPayload = new
            {
                Fullname = "A",
                PhoneNumber = "0901234567",
                TicketQuantity = 0
            };

            var response = await client.PostAsJsonAsync("/api/Event/10/join", invalidPayload);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.JoinDropInEventAsync(It.IsAny<JoinEventRequest>(), It.IsAny<int>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task JoinDropInEvent_ServiceConflict_Returns409()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

            _factory.EventServiceMock
                .Setup(s => s.JoinDropInEventAsync(It.IsAny<JoinEventRequest>(), 10, "customer-1"))
                .ThrowsAsync(new ResourceConflictException("Sự kiện đang được xử lý, vui lòng thử lại."));

            var response = await client.PostAsJsonAsync("/api/Event/10/join", ValidRequest());

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        private static JoinEventRequest ValidRequest()
        {
            return new JoinEventRequest
            {
                Fullname = "Nguyen Van A",
                PhoneNumber = "0901234567",
                TicketQuantity = 1
            };
        }
    }
}
