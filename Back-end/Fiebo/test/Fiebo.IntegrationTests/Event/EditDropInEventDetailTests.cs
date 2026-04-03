using Fiebo.Application.DTOs.Event;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Net.Http.Json;

namespace Fiebo.IntegrationTests.Event
{
    public class EditDropInEventDetailTests : IClassFixture<EventWebApplicationFactory>
    {
        private readonly EventWebApplicationFactory _factory;

        public EditDropInEventDetailTests(EventWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.EventServiceMock.Reset();
        }

        [Fact]
        public async Task EditDropInEvent_AuthorizedOwner_Returns200()
        {
            ResetMocks();
            const int eventId = 5;
            const string ownerId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            var request = ValidRequest();

            _factory.EventServiceMock
                .Setup(s => s.UpdateDropInEventAsync(eventId, It.IsAny<UpdateEventRequest>(), ownerId))
                .Returns(Task.CompletedTask);

            var response = await client.PutAsJsonAsync($"/api/owner/event/{eventId}", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Chỉnh sửa sự kiện thành công.", json.GetProperty("message").GetString());

            _factory.EventServiceMock.Verify(s => s.UpdateDropInEventAsync(
                eventId,
                It.Is<UpdateEventRequest>(r =>
                    r.PricePerPerson == request.PricePerPerson &&
                    r.MinPlayer == request.MinPlayer &&
                    r.MaxPlayer == request.MaxPlayer &&
                    r.Description == request.Description),
                ownerId), Times.Once);
        }

        [Fact]
        public async Task EditDropInEvent_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();

            var response = await client.PutAsJsonAsync("/api/owner/event/5", ValidRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task EditDropInEvent_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

            var response = await client.PutAsJsonAsync("/api/owner/event/5", ValidRequest());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.EventServiceMock.Verify(
                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task EditDropInEvent_EventNotFound_Returns404()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.UpdateDropInEventAsync(404, It.IsAny<UpdateEventRequest>(), "owner-1"))
                .ThrowsAsync(new NotFoundException("Sự kiện này không tồn tại"));

            var response = await client.PutAsJsonAsync("/api/owner/event/404", ValidRequest());

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task EditDropInEvent_ServiceBadRequest_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            _factory.EventServiceMock
                .Setup(s => s.UpdateDropInEventAsync(5, It.IsAny<UpdateEventRequest>(), "owner-1"))
                .ThrowsAsync(new BadRequestException("Không thể chỉnh sửa sự kiện khi đã có người đăng kí"));

            var response = await client.PutAsJsonAsync("/api/owner/event/5", ValidRequest());

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        private static UpdateEventRequest ValidRequest()
        {
            return new UpdateEventRequest
            {
                PricePerPerson = 120000m,
                MinPlayer = 4,
                MaxPlayer = 10,
                Description = "Updated event"
            };
        }
    }
}
