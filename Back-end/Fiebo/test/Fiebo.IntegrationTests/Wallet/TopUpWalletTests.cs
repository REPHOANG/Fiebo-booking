//using Fiebo.Application.DTOs.Wallet;
//using Fiebo.Domain.Exceptions;
//using Fiebo.IntegrationTests.Infrastructure;
//using Moq;
//using System.Net;
//using System.Net.Http.Json;

//namespace Fiebo.IntegrationTests.Wallet
//{
//    public class TopUpWalletTests : IClassFixture<WalletWebApplicationFactory>
//    {
//        private readonly WalletWebApplicationFactory _factory;

//        public TopUpWalletTests(WalletWebApplicationFactory factory)
//        {
//            _factory = factory;
//        }

//        private void ResetMocks()
//        {
//            _factory.WalletServiceMock.Reset();
//        }

//        [Fact]
//        public async Task TopUpWallet_AuthenticatedUser_Returns200WithQrData()
//        {
//            ResetMocks();
//            const string userId = "customer-1";

//            _factory.WalletServiceMock
//                .Setup(s => s.GenerateTopUpQrAsync(200000m, userId))
//                .ReturnsAsync(100);

//            var client = _factory.CreateAuthenticatedClient(userId);
//            var response = await client.PostAsJsonAsync("/api/wallet/top-up", new TopUpRequest { Amount = 200000m });

//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

//            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
//            Assert.Equal("Tạo yêu cầu nạp tiền thành công.", json.GetProperty("message").GetString());
//            Assert.Equal(100, json.GetProperty("data").GetProperty("topUpId").GetInt32());

//            _factory.WalletServiceMock.Verify(s => s.GenerateTopUpQrAsync(200000m, userId), Times.Once);
//        }

//        [Fact]
//        public async Task TopUpWallet_Unauthenticated_Returns401()
//        {
//            ResetMocks();
//            var client = _factory.CreateAnonymousClient();

//            var response = await client.PostAsJsonAsync("/api/wallet/top-up", new TopUpRequest { Amount = 200000m });

//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//            _factory.WalletServiceMock.Verify(
//                s => s.GenerateTopUpQrAsync(It.IsAny<decimal>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//        [Fact]
//        public async Task TopUpWallet_InvalidAmount_Returns400()
//        {
//            ResetMocks();
//            var client = _factory.CreateAuthenticatedClient("customer-1");

//            var response = await client.PostAsJsonAsync("/api/wallet/top-up", new TopUpRequest { Amount = 5000m });

//            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//            _factory.WalletServiceMock.Verify(
//                s => s.GenerateTopUpQrAsync(It.IsAny<decimal>(), It.IsAny<string?>()),
//                Times.Never);
//        }

//            [Fact]
//            public async Task TopUpWallet_InvalidBody_Returns400()
//            {
//                ResetMocks();
//                var client = _factory.CreateAuthenticatedClient("customer-1");

//                var response = await client.PostAsync("/api/wallet/top-up", new StringContent("{", System.Text.Encoding.UTF8, "application/json"));

//                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
//                _factory.WalletServiceMock.Verify(
//                s => s.GenerateTopUpQrAsync(It.IsAny<decimal>(), It.IsAny<string?>()),
//                Times.Never);
//            }

//        [Fact]
//        public async Task TopUpWallet_ServiceNotFound_Returns404()
//        {
//            ResetMocks();
//            const string userId = "user-no-wallet";
//            var client = _factory.CreateAuthenticatedClient(userId);

//            _factory.WalletServiceMock
//                .Setup(s => s.GenerateTopUpQrAsync(200000m, userId))
//                .ThrowsAsync(new NotFoundException("Không tìm thấy ví."));

//            var response = await client.PostAsJsonAsync("/api/wallet/top-up", new TopUpRequest { Amount = 200000m });

//            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
//        }

//    }
//}
