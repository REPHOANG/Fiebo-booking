using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Moq.AutoMock;
using Xunit;

namespace Fiebo.Application.Tests.Wallets
{
    public class GetBalanceAsyncTests
    {
        private readonly AutoMocker _mocker;
        private readonly WalletService _walletService;

        public GetBalanceAsyncTests()
        {
            _mocker = new AutoMocker();
            _walletService = _mocker.CreateInstance<WalletService>();
        }

        [Fact]
        public async Task GetBalanceAsync_ShouldThrow_WhenWalletNotFound()
        {
            // Arrange
            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByUserId(It.IsAny<string>()))
                .ReturnsAsync((Wallet)null!);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _walletService.GetBalanceAsync("user1"));
        }

        [Fact]
        public async Task GetBalanceAsync_ShouldReturnBalance_WhenWalletExists()
        {
            // Arrange
            var wallet = new Wallet
            {
                Id = 1,
                UserId = "user1",
                Balance = 500,
                Transactions = [],
                TopUpRequests = []
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByUserId("user1"))
                .ReturnsAsync(wallet);

            // Act
            var result = await _walletService.GetBalanceAsync("user1");

            // Assert
            Assert.Equal(500, result);
        }
    }
}