using Fiebo.Application.DTOs.Field;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;

namespace Fiebo.IntegrationTests.Field
{
    public class EditFieldTests : IClassFixture<FieldWebApplicationFactory>
    {
        private readonly FieldWebApplicationFactory _factory;

        public EditFieldTests(FieldWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private void ResetMocks()
        {
            _factory.FieldServiceMock.Reset();
            _factory.VenueServiceMock.Reset();
            _factory.TimeSlotServiceMock.Reset();
        }

        [Fact]
        public async Task UpdateField_AuthorizedOwner_Returns200()
        {
            ResetMocks();
            const int fieldId = 10;
            const string userId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldOwner);
            using var content = CreateFormContent("S\u00e2n M\u1edbi", "M\u00f4 t\u1ea3 m\u1edbi", "2");

            _factory.FieldServiceMock
                .Setup(s => s.UpdateFieldAsync(
                    It.IsAny<UpdateFieldRequest>(),
                    userId,
                    fieldId))
                .Returns(Task.CompletedTask);

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            Assert.Equal("C\u1eadp nh\u1eadt th\u00f4ng tin s\u00e2n th\u00e0nh c\u00f4ng.", json.GetProperty("message").GetString());

            _factory.FieldServiceMock.Verify(s => s.UpdateFieldAsync(
                It.Is<UpdateFieldRequest>(r =>
                    r.Name == "S\u00e2n M\u1edbi" &&
                    r.Description == "M\u00f4 t\u1ea3 m\u1edbi" &&
                    r.SportTypeId == 2),
                userId,
                fieldId), Times.Once);
        }

        [Fact]
        public async Task UpdateField_Unauthenticated_Returns401()
        {
            ResetMocks();
            const int fieldId = 10;

            var client = _factory.CreateAnonymousClient();
            using var content = CreateFormContent("S\u00e2n M\u1edbi", "M\u00f4 t\u1ea3", "2");

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            _factory.FieldServiceMock.Verify(s => s.UpdateFieldAsync(It.IsAny<UpdateFieldRequest>(), It.IsAny<string?>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateField_WrongRole_Returns403()
        {
            ResetMocks();
            const int fieldId = 10;

            var client = _factory.CreateAuthenticatedClient("admin-1", AppRoles.Admin);
            using var content = CreateFormContent("S\u00e2n M\u1edbi", "M\u00f4 t\u1ea3", "2");

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            _factory.FieldServiceMock.Verify(s => s.UpdateFieldAsync(It.IsAny<UpdateFieldRequest>(), It.IsAny<string?>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateField_InvalidModel_Returns400()
        {
            ResetMocks();
            const int fieldId = 10;
            var client = _factory.CreateAuthenticatedClient("owner-1", AppRoles.FieldOwner);

            using var content = new MultipartFormDataContent();
            content.Add(new StringContent("2"), "SportTypeId");

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _factory.FieldServiceMock.Verify(s => s.UpdateFieldAsync(It.IsAny<UpdateFieldRequest>(), It.IsAny<string?>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateField_FieldNotFound_Returns404()
        {
            ResetMocks();
            const int fieldId = 999;
            const string userId = "owner-1";

            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldOwner);
            using var content = CreateFormContent("S\u00e2n M\u1edbi", "M\u00f4 t\u1ea3", "2");

            _factory.FieldServiceMock
                .Setup(s => s.UpdateFieldAsync(It.IsAny<UpdateFieldRequest>(), userId, fieldId))
                .ThrowsAsync(new NotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y s\u00e2n."));

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task UpdateField_NotOwner_Returns403()
        {
            ResetMocks();
            const int fieldId = 10;
            const string userId = "owner-2";

            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldOwner);
            using var content = CreateFormContent("Sân Mới", "Mô tả", "2");

            _factory.FieldServiceMock
                .Setup(s => s.UpdateFieldAsync(It.IsAny<UpdateFieldRequest>(), userId, fieldId))
                .ThrowsAsync(new ForbiddenException("Bạn không có quyền chỉnh sửa sân này."));

            var response = await client.PutAsync($"/api/owner/field/{fieldId}", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        private static MultipartFormDataContent CreateFormContent(string name, string description, string sportTypeId)
        {
            var content = new MultipartFormDataContent();
            content.Add(new StringContent(name), "Name");
            content.Add(new StringContent(description), "Description");
            content.Add(new StringContent(sportTypeId), "SportTypeId");
            return content;
        }
    }
}
