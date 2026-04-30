//using Fiebo.Application.DTOs.Event;
//using Fiebo.Domain.Constants;
//using Fiebo.Domain.Exceptions;
//using Fiebo.IntegrationTests.Infrastructure;
//using Moq;
//using System.Net;
//using System.Net.Http.Json;

//namespace Fiebo.IntegrationTests.Event
//{
//    public class UpdateDropInEventTests : IClassFixture<EventWebApplicationFactory>
//    {
//        private readonly EventWebApplicationFactory _factory;

//        public UpdateDropInEventTests(EventWebApplicationFactory factory)
//        {
//            _factory = factory;
//        }

//        private void ResetMocks()
//        {
//            _factory.EventServiceMock.Reset();
//        }

//        private static UpdateEventRequest ValidRequest()
//        {
//            return new UpdateEventRequest
//            {
//                PricePerPerson = 100000,
//                MinPlayer = 5,
//                MaxPlayer = 10,
//                Description = "Updated event"
//            };
//        }

//        private static string Url(int eventId) => $"/api/owner/event/{eventId}";

//        //[Fact]
//        //public async Task UpdateEvent_AuthorizedOwner_Returns200()
//        //{
//        //    ResetMocks();
//        //    const int eventId = 10;
//        //    const string ownerId = "owner-1";
//        //    var request = ValidRequest();

//        //    var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

//        //    _factory.EventServiceMock
//        //        .Setup(s => s.UpdateDropInEventAsync(
//        //            It.IsAny<int>(),
//        //            It.IsAny<UpdateEventRequest>(),
//        //            It.IsAny<string>()))
//        //        .Returns(Task.CompletedTask);

//        //    var response = await client.PutAsJsonAsync(Url(eventId), request);

//        //    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

//        //    var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//        //    Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
//        //    Assert.Equal("Chỉnh sửa sự kiện thành công.", json.GetProperty("message").GetString());

//        //    _factory.EventServiceMock.Verify(s => s.UpdateDropInEventAsync(
//        //        eventId,
//        //        It.Is<UpdateEventRequest>(r =>
//        //            r.PricePerPerson == request.PricePerPerson &&
//        //            r.MinPlayer == request.MinPlayer &&
//        //            r.MaxPlayer == request.MaxPlayer &&
//        //            r.Description == request.Description),
//        //        ownerId),
//        //        Times.Once);
//        //}

//        [Fact]
//        public async Task UpdateEvent_Unauthenticated_Returns401()
//        {
//            ResetMocks();
//            var client = _factory.CreateAnonymousClient();

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//            _factory.EventServiceMock.Verify(
//                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task UpdateEvent_WrongRole_Returns403()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
//            _factory.EventServiceMock.Verify(
//                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
//                Times.Never);
//        }

//        //[Fact]
//        //public async Task UpdateEvent_NotFound_Returns404()
//        //{
//        //    ResetMocks();
//        //    var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//        //    _factory.EventServiceMock
//        //        .Setup(s => s.UpdateDropInEventAsync(
//        //            It.IsAny<int>(),
//        //            It.IsAny<UpdateEventRequest>(),
//        //            It.IsAny<string>()))
//        //        .ThrowsAsync(new NotFoundException("Sự kiện này không tồn tại"));

//        //    var response = await client.PutAsJsonAsync(Url(999), ValidRequest());

//        //    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
//        //}

//        [Fact]
//        public async Task UpdateEvent_NoSlot_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.EventServiceMock
//                .Setup(s => s.UpdateDropInEventAsync(
//                    It.IsAny<int>(),
//                    It.IsAny<UpdateEventRequest>(),
//                    It.IsAny<string>()))
//                .ThrowsAsync(new BadRequestException("Sự kiện không có slot"));

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task UpdateEvent_NotOwner_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-2", AppRoles.FieldOwner);

//            _factory.EventServiceMock
//                .Setup(s => s.UpdateDropInEventAsync(
//                    It.IsAny<int>(),
//                    It.IsAny<UpdateEventRequest>(),
//                    It.IsAny<string>()))
//                .ThrowsAsync(new BadRequestException("Bạn không có quyền chỉnh sửa sự kiện này"));

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task UpdateEvent_InvalidStatus_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.EventServiceMock
//                .Setup(s => s.UpdateDropInEventAsync(
//                    It.IsAny<int>(),
//                    It.IsAny<UpdateEventRequest>(),
//                    It.IsAny<string>()))
//                .ThrowsAsync(new BadRequestException("Chỉ sự kiện với trạng thái đang chờ mới có thể sửa"));

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task UpdateEvent_HasParticipants_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.EventServiceMock
//                .Setup(s => s.UpdateDropInEventAsync(
//                    It.IsAny<int>(),
//                    It.IsAny<UpdateEventRequest>(),
//                    It.IsAny<string>()))
//                .ThrowsAsync(new BadRequestException("Không thể chỉnh sửa sự kiện khi đã có người đăng kí"));

//            var response = await client.PutAsJsonAsync(Url(10), ValidRequest());

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task UpdateEvent_InvalidModel_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            var invalidPayload = new
//            {
//                PricePerPerson = 0,
//                MinPlayer = 0,
//                MaxPlayer = 0
//            };

//            var response = await client.PutAsJsonAsync(Url(10), invalidPayload);

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//            _factory.EventServiceMock.Verify(
//                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task UpdateEvent_MaxLessThanMin_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            var request = new UpdateEventRequest
//            {
//                PricePerPerson = 100000,
//                MinPlayer = 10,
//                MaxPlayer = 5,
//                Description = "Invalid"
//            };

//            _factory.EventServiceMock
//                .Setup(s => s.UpdateDropInEventAsync(
//                    It.IsAny<int>(),
//                    It.IsAny<UpdateEventRequest>(),
//                    It.IsAny<string>()))
//                .ThrowsAsync(new BadRequestException("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu"));

//            var response = await client.PutAsJsonAsync(Url(10), request);

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task UpdateEvent_InvalidBody_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            var response = await client.PutAsync(Url(10), new StringContent("{", System.Text.Encoding.UTF8, "application/json"));

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//            _factory.EventServiceMock.Verify(
//                s => s.UpdateDropInEventAsync(It.IsAny<int>(), It.IsAny<UpdateEventRequest>(), It.IsAny<string>()),
//                Times.Never);
//        }
//    }
//}