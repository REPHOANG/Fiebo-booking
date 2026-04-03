using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;

namespace Fiebo.IntegrationTests.Venue
{
    public class CreateVenueTests : IClassFixture<VenueWebApplicationFactory>
    {
        private readonly VenueWebApplicationFactory _factory;

        public CreateVenueTests(VenueWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.VenueServiceMock.Reset();
            _factory.FieldServiceMock.Reset();
            _factory.TimeSlotServiceMock.Reset();
        }

        [Fact]
        public async Task CreateVenue_AuthorizedOwner_Returns200WithData()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            CreateVenueRequest? capturedRequest = null;

            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            using var content = ValidCreateVenueForm();

            _factory.VenueServiceMock
                .Setup(s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), ownerId))
                .Callback<CreateVenueRequest, string?>((request, _) => capturedRequest = request)
                .ReturnsAsync(new CreateVenueResponse
                {
                    VenueId = 123,
                    Status = "Draft"
                });

            var response = await client.PostAsync("/api/owner/venue/draft", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Tạo sân thành công", json.GetProperty("message").GetString());
            Assert.Equal(123, json.GetProperty("data").GetProperty("venueId").GetInt32());
            Assert.Equal("Draft", json.GetProperty("data").GetProperty("status").GetString());

            _factory.VenueServiceMock.Verify(s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), ownerId), Times.Once);
            Assert.NotNull(capturedRequest);
            Assert.Equal("Venue Alpha", capturedRequest!.Name);
            Assert.Equal(new TimeOnly(6, 0), capturedRequest.OpenTime);
            Assert.Equal(new TimeOnly(22, 0), capturedRequest.CloseTime);
            Assert.Equal("123 Test Street", capturedRequest.AddressDetail);
            Assert.Equal(1, capturedRequest.ProvinceId);
            Assert.Equal(2, capturedRequest.WardId);
        }

        [Fact]
        public async Task CreateVenue_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();
            using var content = ValidCreateVenueForm();

            var response = await client.PostAsync("/api/owner/venue/draft", content);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateVenue_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("admin-1", AppRoles.Admin);
            using var content = ValidCreateVenueForm();

            var response = await client.PostAsync("/api/owner/venue/draft", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateVenue_InvalidModel_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            using var invalid = new MultipartFormDataContent();
            invalid.Add(new StringContent("06:00:00"), "OpenTime");
            invalid.Add(new StringContent("22:00:00"), "CloseTime");

            var response = await client.PostAsync("/api/owner/venue/draft", invalid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateVenue_ServiceBadRequest_Returns400()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            using var content = ValidCreateVenueForm();

            _factory.VenueServiceMock
                .Setup(s => s.CreateVenueAsync(It.IsAny<CreateVenueRequest>(), ownerId))
                .ThrowsAsync(new BadRequestException("Giờ đóng cửa phải sau giờ mở cửa."));

            var response = await client.PostAsync("/api/owner/venue/draft", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        private static MultipartFormDataContent ValidCreateVenueForm()
        {
            var content = new MultipartFormDataContent();
            content.Add(new StringContent("Venue Alpha"), "Name");
            content.Add(new StringContent("06:00:00"), "OpenTime");
            content.Add(new StringContent("22:00:00"), "CloseTime");
            content.Add(new StringContent("Great place"), "Description");
            content.Add(new StringContent("123 Test Street"), "AddressDetail");
            content.Add(new StringContent("1"), "ProvinceId");
            content.Add(new StringContent("2"), "WardId");
            content.Add(new StringContent("21.027381"), "Latitude");
            content.Add(new StringContent("105.833529"), "Longitude");
            return content;
        }
    }
}
