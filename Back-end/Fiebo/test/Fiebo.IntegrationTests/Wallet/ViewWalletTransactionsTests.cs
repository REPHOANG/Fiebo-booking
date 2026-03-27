using Fiebo.Application.DTOs.Wallet;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Shared;
using Fiebo.IntegrationTests.Infrastructure;
using Moq;
using System.Net;

namespace Fiebo.IntegrationTests.Wallet
{
    /// <summary>
    /// Integration tests for <c>GET /api/wallet/transactions</c>.
    /// </summary>
    public class ViewWalletTransactionsTests : IClassFixture<WalletWebApplicationFactory>
    {
        private readonly WalletWebApplicationFactory _factory;

        public ViewWalletTransactionsTests(WalletWebApplicationFactory factory)
        {
            _factory = factory;
        }

        // ================================================================
        // SCENARIO 1 – Happy path: Authorized user gets transactions
        // ================================================================
        [Fact]
        public async Task GetTransactions_AuthorizedUser_Returns200WithData()
        {
            // Arrange
            const string userId = "customer-123";
            var fromDate = new DateTime(2023, 1, 1);
            var toDate = new DateTime(2023, 1, 31);
            var expectedTransactions = new PagedResult<WalletTransactionResponse>
            {
                Page = 1,
                PageSize = 10,
                TotalItems = 1,
                Items = new List<WalletTransactionResponse>
                {
                    new WalletTransactionResponse
                    {
                        Id = 1,
                        Amount = 100_000,
                        Direction = "Credit",
                        TransactionType = "TopUp",
                        CreatedAt = new DateTime(2023, 1, 15)
                    }
                }
            };

            _factory.WalletServiceMock
                .Setup(s => s.GetWalletTransactionsAsync(userId, 1, 10, fromDate, toDate))
                .ReturnsAsync(expectedTransactions);

            // Using Customer role which has access
            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.Customer);

            // Act
            var response = await client.GetAsync($"/api/wallet/transactions?page=1&pageSize=10&from={fromDate:yyyy-MM-dd}&to={toDate:yyyy-MM-dd}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(200, json.GetProperty("statusCode").GetInt32());
            
            var data = json.GetProperty("data");
            Assert.Equal(1, data.GetProperty("totalItems").GetInt32());
            Assert.Equal(100_000, data.GetProperty("items")[0].GetProperty("amount").GetDecimal());
            Assert.Equal("TopUp", data.GetProperty("items")[0].GetProperty("transactionType").GetString());
        }

        // ================================================================
        // SCENARIO 2 – Unauthorized: User lacks proper role -> 403 Forbidden
        // ================================================================
        [Fact]
        public async Task GetTransactions_UnauthorizedRole_Returns403()
        {
            // Arrange
            const string userId = "admin-123";
            // Admin role is NOT listed in the endpoint's Authorize(Roles)
            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.Admin);

            // Act
            var response = await client.GetAsync("/api/wallet/transactions");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        // ================================================================
        // SCENARIO 3 – Unauthenticated: Anonymous request -> 401 Unauthorized
        // ================================================================
        [Fact]
        public async Task GetTransactions_Unauthenticated_Returns401()
        {
            // Arrange
            var client = _factory.CreateAnonymousClient();

            // Act
            var response = await client.GetAsync("/api/wallet/transactions");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ================================================================
        // SCENARIO 4 – Bad Request: Invalid dates (from > to)
        // ================================================================
        [Fact]
        public async Task GetTransactions_InvalidDates_Returns400()
        {
            // Arrange
            const string userId = "customer-err";
            // The service layer throws a BadRequestException if dates are invalid
            _factory.WalletServiceMock
                .Setup(s => s.GetWalletTransactionsAsync(userId, 1, 10, It.IsAny<DateTime?>(), It.IsAny<DateTime?>()))
                .ThrowsAsync(new BadRequestException("From date must be less than to date"));

            var client = _factory.CreateAuthenticatedClient(userId, AppRoles.Customer);

            // Act
            var response = await client.GetAsync("/api/wallet/transactions?page=1&pageSize=10");

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            
            var json = await FieboWebApplicationFactory.ReadJsonAsync(response);
            Assert.Equal(400, json.GetProperty("statusCode").GetInt32());
            Assert.Contains("From date must be less than to date", json.GetProperty("message").GetString() ?? "");
        }
    }
}
