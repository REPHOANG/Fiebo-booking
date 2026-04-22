//using Fiebo.Domain.Constants;
//using Fiebo.Domain.Exceptions;
//using Fiebo.IntegrationTests.Infrastructure;
//using Moq;
//using System.Net;

//namespace Fiebo.IntegrationTests.Venue
//{
//    public class SubmitVenueTests : IClassFixture<VenueWebApplicationFactory>
//    {
//        private readonly VenueWebApplicationFactory _factory;

//        public SubmitVenueTests(VenueWebApplicationFactory factory)
//        {
//            _factory = factory;
//        }

//        private void ResetMocks()
//        {
//            _factory.VenueServiceMock.Reset();
//            _factory.FieldServiceMock.Reset();
//            _factory.TimeSlotServiceMock.Reset();
//        }

//        [Fact]
//        public async Task SubmitVenue_AuthorizedOwner_Returns200()
//        {
//            ResetMocks();
//            const int venueId = 10;
//            const string ownerId = "owner-1";
//            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);

//            _factory.VenueServiceMock
//                .Setup(s => s.SubmitVenueDraftAsync(venueId, ownerId))
//                .Returns(Task.CompletedTask);

//            var response = await client.PutAsync($"/api/owner/venues/{venueId}/submit", null);

//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
//            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
//            Assert.Equal("Nộp duyệt sân thành công.", json.GetProperty("message").GetString());

//            _factory.VenueServiceMock.Verify(s => s.SubmitVenueDraftAsync(venueId, ownerId), Times.Once);
//        }

//        [Fact]
//        public async Task SubmitVenue_Unauthenticated_Returns401()
//        {
//            ResetMocks();
//            var client = _factory.CreateAnonymousClient();

//            var response = await client.PutAsync("/api/owner/venues/10/submit", null);

//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//            _factory.VenueServiceMock.Verify(
//                s => s.SubmitVenueDraftAsync(It.IsAny<int>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task SubmitVenue_WrongRole_Returns403()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

//            var response = await client.PutAsync("/api/owner/venues/10/submit", null);

//            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
//            _factory.VenueServiceMock.Verify(
//                s => s.SubmitVenueDraftAsync(It.IsAny<int>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task SubmitVenue_ServiceNotFound_Returns404()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.VenueServiceMock
//                .Setup(s => s.SubmitVenueDraftAsync(404, "owner-1"))
//                .ThrowsAsync(new NotFoundException("Không tìm thấy cơ sở"));

//            var response = await client.PutAsync("/api/owner/venues/404/submit", null);

//            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
//        }

//        [Fact]
//        public async Task SubmitVenue_ServiceBadRequest_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.VenueServiceMock
//                .Setup(s => s.SubmitVenueDraftAsync(10, "owner-1"))
//                .ThrowsAsync(new BadRequestException("Vui lòng tải lên đầy đủ giấy tờ trước khi gửi duyệt"));

//            var response = await client.PutAsync("/api/owner/venues/10/submit", null);

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task SubmitVenue_NotOwner_Returns401()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-2", AppRoles.FieldOwner);

//            _factory.VenueServiceMock
//                .Setup(s => s.SubmitVenueDraftAsync(10, "owner-2"))
//                .ThrowsAsync(new UnauthorizedException("Bạn không có quyền gửi duyệt bản nháp của sân này"));

//            var response = await client.PutAsync("/api/owner/venues/10/submit", null);

//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//        }

//        [Fact]
//        public async Task SubmitVenue_ServiceConflict_Returns409()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

//            _factory.VenueServiceMock
//                .Setup(s => s.SubmitVenueDraftAsync(10, "owner-1"))
//                .ThrowsAsync(new ResourceConflictException("Yêu cầu gửi duyệt đang được xử lý."));

//            var response = await client.PutAsync("/api/owner/venues/10/submit", null);

//            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
//        }
//    }
//}
