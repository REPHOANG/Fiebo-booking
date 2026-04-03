using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;
using System.Text;

namespace Fiebo.IntegrationTests.Venue
{
    public class UploadVenueDocumentTests : IClassFixture<VenueWebApplicationFactory>
    {
        private readonly VenueWebApplicationFactory _factory;

        public UploadVenueDocumentTests(VenueWebApplicationFactory factory)
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
        public async Task UploadVenueDocument_AuthorizedOwner_Returns200()
        {
            ResetMocks();
            const int venueId = 10;
            const string ownerId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            using var content = ValidUploadForm();

            _factory.VenueServiceMock
                .Setup(s => s.UploadVenueDocumentAsync(venueId, ownerId, It.IsAny<CreateVenueDocumentRequest>()))
                .Returns(Task.CompletedTask);

            var response = await client.PostAsync($"/api/owner/venues/{venueId}/documents", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("Tải lên tài liệu sân thành công.", json.GetProperty("message").GetString());

            _factory.VenueServiceMock.Verify(s => s.UploadVenueDocumentAsync(
                venueId,
                ownerId,
                It.Is<CreateVenueDocumentRequest>(r =>
                    r.BusinessDocument.IssueDate.Date == new DateTime(2020, 1, 1).Date &&
                    r.BusinessDocument.ExpiryDate.Date == new DateTime(2030, 1, 1).Date &&
                    r.BusinessDocument.Images.Count == 1 &&
                    r.LandUseDocument.IssueDate.Date == new DateTime(2021, 1, 1).Date &&
                    r.LandUseDocument.ExpiryDate.Date == new DateTime(2031, 1, 1).Date &&
                    r.LandUseDocument.Images.Count == 1)),
                Times.Once);
        }

        [Fact]
        public async Task UploadVenueDocument_Unauthenticated_Returns401()
        {
            ResetMocks();
            var client = _factory.CreateAnonymousClient();
            using var content = ValidUploadForm();

            var response = await client.PostAsync("/api/owner/venues/10/documents", content);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.UploadVenueDocumentAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CreateVenueDocumentRequest>()),
                Times.Never);
        }

        [Fact]
        public async Task UploadVenueDocument_WrongRole_Returns403()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);
            using var content = ValidUploadForm();

            var response = await client.PostAsync("/api/owner/venues/10/documents", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.UploadVenueDocumentAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CreateVenueDocumentRequest>()),
                Times.Never);
        }

        [Fact]
        public async Task UploadVenueDocument_InvalidModel_Returns400()
        {
            ResetMocks();
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            using var invalid = new MultipartFormDataContent();

            var response = await client.PostAsync("/api/owner/venues/10/documents", invalid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.VenueServiceMock.Verify(
                s => s.UploadVenueDocumentAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CreateVenueDocumentRequest>()),
                Times.Never);
        }

        [Fact]
        public async Task UploadVenueDocument_ServiceNotFound_Returns404()
        {
            ResetMocks();
            const string ownerId = "owner-1";
            var client = _factory.CreateAuthenticatedClient(ownerId, AppRoles.FieldOwner);
            using var content = ValidUploadForm();

            _factory.VenueServiceMock
                .Setup(s => s.UploadVenueDocumentAsync(404, ownerId, It.IsAny<CreateVenueDocumentRequest>()))
                .ThrowsAsync(new NotFoundException("Không tìm thấy cơ sở"));

            var response = await client.PostAsync("/api/owner/venues/404/documents", content);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        private static MultipartFormDataContent ValidUploadForm()
        {
            var content = new MultipartFormDataContent();

            content.Add(new StringContent("2020-01-01"), "BusinessDocument.IssueDate");
            content.Add(new StringContent("2030-01-01"), "BusinessDocument.ExpiryDate");
            content.Add(CreateFileContent("business-doc"), "BusinessDocument.Images", "business.jpg");

            content.Add(new StringContent("2021-01-01"), "LandUseDocument.IssueDate");
            content.Add(new StringContent("2031-01-01"), "LandUseDocument.ExpiryDate");
            content.Add(CreateFileContent("land-doc"), "LandUseDocument.Images", "land.jpg");

            return content;
        }

        private static ByteArrayContent CreateFileContent(string value)
        {
            var bytes = Encoding.UTF8.GetBytes(value);
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
            return fileContent;
        }
    }
}
