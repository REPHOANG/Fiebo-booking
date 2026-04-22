//using Fiebo.Application.DTOs.Booking;
//using Fiebo.Domain.Constants;
//using Fiebo.Domain.Exceptions;
//using Fiebo.IntegrationTests.Infrastructure;
//using Moq;
//using System.Net;
//using System.Net.Http.Json;

//namespace Fiebo.IntegrationTests.Booking
//{
//    public class CreateWalkInBookingTests : IClassFixture<BookingWebApplicationFactory>
//    {
//        private readonly BookingWebApplicationFactory _factory;

//        public CreateWalkInBookingTests(BookingWebApplicationFactory factory)
//        {
//            _factory = factory;
//        }

//        private void ResetMocks()
//        {
//            _factory.BookingServiceMock.Reset();
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_AuthorizedFieldStaff_Returns200()
//        {
//            ResetMocks();
//            const string userId = "staff-1";
//            var request = ValidRequest();

//            _factory.BookingServiceMock
//                .Setup(s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), userId, AppRoles.FieldStaff))
//                .ReturnsAsync(true);

//            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldStaff);
//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", request);

//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
//            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
//            Assert.Equal("Tạo lịch đặt thành công.", json.GetProperty("message").GetString());

//            _factory.BookingServiceMock.Verify(s => s.CreateWalkInBookingAsync(
//                It.Is<CreateBookingRequest>(r =>
//                    r.VenueId == request.VenueId &&
//                    r.BookingDate == request.BookingDate &&
//                    r.Fullname == request.Fullname &&
//                    r.PhoneNumber == request.PhoneNumber &&
//                    r.Details.Count == 1 &&
//                    r.Details[0].FieldId == 1 &&
//                    r.Details[0].SlotId == 10),
//                userId,
//                AppRoles.FieldStaff), Times.Once);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_AuthorizedFieldOwner_Returns200()
//        {
//            ResetMocks();
//            const string userId = "owner-1";
//            var request = ValidRequest();

//            _factory.BookingServiceMock
//                .Setup(s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), userId, AppRoles.FieldOwner))
//                .ReturnsAsync(true);

//            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldOwner);
//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", request);

//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

//            _factory.BookingServiceMock.Verify(s => s.CreateWalkInBookingAsync(
//                It.Is<CreateBookingRequest>(r =>
//                    r.VenueId == request.VenueId &&
//                    r.BookingDate == request.BookingDate),
//                userId,
//                AppRoles.FieldOwner), Times.Once);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_Unauthenticated_Returns401()
//        {
//            ResetMocks();
//            var client = _factory.CreateAnonymousClient();

//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", ValidRequest());

//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//            _factory.BookingServiceMock.Verify(
//                s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), It.IsAny<string>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_WrongRole_Returns403()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("customer-1", AppRoles.Customer);

//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", ValidRequest());

//            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
//            _factory.BookingServiceMock.Verify(
//                s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), It.IsAny<string>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_ServiceBadRequest_Returns400()
//        {
//            ResetMocks();
//            const string userId = "staff-1";
//            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldStaff);

//            _factory.BookingServiceMock
//                .Setup(s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), userId, AppRoles.FieldStaff))
//                .ThrowsAsync(new BadRequestException("Cơ sở này hiện không hoạt động."));

//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", ValidRequest());

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_ServiceConflict_Returns409()
//        {
//            ResetMocks();
//            const string userId = "staff-1";
//            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.FieldStaff);

//            _factory.BookingServiceMock
//                .Setup(s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), userId, AppRoles.FieldStaff))
//                .ThrowsAsync(new ResourceConflictException("Sân hiện tại hiện không có slot trống."));

//            var response = await client.PostAsJsonAsync("/api/booking/walk-in", ValidRequest());

//            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
//        }

//        [Fact]
//        public async Task CreateWalkInBooking_InvalidBody_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("staff-1", AppRoles.FieldStaff);

//            var response = await client.PostAsync("/api/booking/walk-in", new StringContent("{", System.Text.Encoding.UTF8, "application/json"));

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//            _factory.BookingServiceMock.Verify(
//                s => s.CreateWalkInBookingAsync(It.IsAny<CreateBookingRequest>(), It.IsAny<string>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        private static CreateBookingRequest ValidRequest()
//        {
//            return new CreateBookingRequest
//            {
//                VenueId = 10,
//                BookingDate = new DateOnly(2026, 4, 10),
//                Fullname = "Nguyen Van A",
//                PhoneNumber = "0901234567",
//                BookingNote = "Walk-in booking",
//                Details =
//                [
//                    new CreateBookingDetailRequest
//                    {
//                        FieldId = 1,
//                        SlotId = 10
//                    }
//                ]
//            };
//        }
//    }
//}
