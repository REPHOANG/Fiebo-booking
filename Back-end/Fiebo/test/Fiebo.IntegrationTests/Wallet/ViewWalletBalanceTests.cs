//using Fiebo.Domain.Exceptions;
//using Fiebo.IntegrationTests.Infrastructure;
//using Moq;
//using System.Net;

//namespace Fiebo.IntegrationTests.Wallet
//{
//    /// <summary>
//    /// Integration tests for <c>GET /api/wallet/balance</c>.
//    /// The real ASP.NET Core pipeline is exercised (routing, auth middleware,
//    /// exception middleware) while <see cref="Fiebo.Application.Interfaces.IWalletService"/> is replaced
//    /// with a Moq mock – no database required.
//    /// </summary>
//    public class ViewWalletBalanceTests : IClassFixture<WalletWebApplicationFactory>
//    {
//        private readonly WalletWebApplicationFactory _factory;

//        public ViewWalletBalanceTests(WalletWebApplicationFactory factory)
//        {
//            _factory = factory;
//        }

//        // ================================================================
//        // SCENARIO 1 – Happy path: authenticated user gets balance 200 OK
//        // ================================================================
//        [Fact]
//        public async Task GetBalance_AuthenticatedUser_Returns200WithBalance()
//        {
//            // Arrange
//            const string userId          = "user-abc-123";
//            const decimal expectedBalance = 500_000m;

//            _factory.WalletServiceMock
//                .Setup(s => s.GetBalanceAsync(userId))
//                .ReturnsAsync(expectedBalance);

//            var client = _factory.CreateAuthenticatedClient(userId);

//            // Act
//            var response = await client.GetAsync("/api/wallet/balance");

//            // Assert – HTTP status
//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

//            // Assert – body shape
//            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
//            Assert.Equal("Lấy số dư thành công.", json.GetProperty("message").GetString());

//            var balance = json.GetProperty("data").GetProperty("balance").GetDecimal();
//            Assert.Equal(expectedBalance, balance);

//            // Assert – service called exactly once with the correct userId
//            _factory.WalletServiceMock.Verify(s => s.GetBalanceAsync(userId), Times.Once);
//        }

//        // ================================================================
//        // SCENARIO 2 – Zero balance still returns 200 OK
//        // ================================================================
//        [Fact]
//        public async Task GetBalance_WalletHasZeroBalance_Returns200WithZero()
//        {
//            // Arrange
//            const string userId = "user-zero-balance";
//            _factory.WalletServiceMock
//                .Setup(s => s.GetBalanceAsync(userId))
//                .ReturnsAsync(0m);

//            var client = _factory.CreateAuthenticatedClient(userId);

//            // Act
//            var response = await client.GetAsync("/api/wallet/balance");

//            // Assert
//            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

//            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
//            Assert.Equal(0m, json.GetProperty("data").GetProperty("balance").GetDecimal());
//        }

//        // ================================================================
//        // SCENARIO 3 – Unauthenticated request is rejected with 401
//        // ================================================================
//        [Fact]
//        public async Task GetBalance_Unauthenticated_Returns401()
//        {
//            // Arrange
//            var client = _factory.CreateAnonymousClient();

//            // Act
//            var response = await client.GetAsync("/api/wallet/balance");

//            // Assert
//            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
//        }

//        // ================================================================
//        // SCENARIO 4 – Wallet not found → NotFoundException → 404
//        // ================================================================
//        [Fact]
//        public async Task GetBalance_WalletNotFound_Returns404()
//        {
//            // Arrange
//            const string userId = "user-no-wallet";
//            _factory.WalletServiceMock
//                .Setup(s => s.GetBalanceAsync(userId))
//                .ThrowsAsync(new NotFoundException("Wallet is not found"));

//            var client = _factory.CreateAuthenticatedClient(userId);

//            // Act
//            var response = await client.GetAsync("/api/wallet/balance");

//            // Assert
//            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
//        }

//        // ================================================================
//        // SCENARIO 5 – Unexpected exception from service → 500
//        // ================================================================
//        [Fact]
//        public async Task GetBalance_ServiceThrowsUnexpectedException_Returns500()
//        {
//            // Arrange
//            const string userId = "user-exception";
//            _factory.WalletServiceMock
//                .Setup(s => s.GetBalanceAsync(userId))
//                .ThrowsAsync(new InvalidOperationException("Unexpected error"));

//            var client = _factory.CreateAuthenticatedClient(userId);

//            // Act
//            var response = await client.GetAsync("/api/wallet/balance");

//            // Assert
//            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
//        }
//    }
//}
