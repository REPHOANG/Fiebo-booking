using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using Moq.AutoMock;
using Xunit;

namespace Fiebo.Application.Tests.Wallets
{
    public class GenerateTopUpQrAsyncTests
    {
        private readonly AutoMocker _mocker;
        private readonly WalletService _walletService;

        public GenerateTopUpQrAsyncTests()
        {
            _mocker = new AutoMocker();

            var walletRepo = new Mock<IWalletRepository>();
            var topUpRepo = new Mock<ITopUpRequestRepository>();
            var transactionRepo = new Mock<IWalletTransactionRepository>();

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets)
                .Returns(walletRepo.Object);

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests)
                .Returns(topUpRepo.Object);

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.WalletTransactions)
                .Returns(transactionRepo.Object);

            _walletService = _mocker.CreateInstance<WalletService>();
        }

        [Fact]
        public async Task GenerateTopUpQrAsync_ShouldThrow_WhenWalletNotFound()
        {
            // Arrange
            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByUserId(It.IsAny<string>()))
                .ReturnsAsync((Wallet)null!);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _walletService.GenerateTopUpQrAsync(100, "user1"));
        }

        [Fact]
        public async Task GenerateTopUpQrAsync_ShouldThrow_WhenUserIdIsNull()
        {
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _walletService.GenerateTopUpQrAsync(100, null));
        }

        [Fact]
        public async Task GenerateTopUpQrAsync_ShouldCreateTopUpRequestAndReturnId_WhenWalletExists()
        {
            // Arrange

            var wallet = new Wallet
            {
                Id = 1,
                UserId = "user1",
                Balance = 0,
                CreatedDate = DateTime.UtcNow,
                Transactions = [],
                TopUpRequests = []
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByUserId("user1"))
                .ReturnsAsync(wallet);

            Domain.Entities.TopUpRequest? captured = null;
            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests.Add(It.IsAny<Domain.Entities.TopUpRequest>()))
                .Callback<Domain.Entities.TopUpRequest>(r =>
                {
                    r.Id = 123;
                    captured = r;
                });

            // Act
            var result = await _walletService.GenerateTopUpQrAsync(100, "user1");

            // Assert
            Assert.Equal(123, result);
            Assert.NotNull(captured);
            Assert.Equal(wallet.Id, captured!.WalletId);
            Assert.Equal(100, captured.Amount);
            Assert.Equal(TopUpStatus.Pending, captured.Status);

            _mocker.GetMock<IUnitOfWork>()
                .Verify(x => x.TopUpRequests.Add(It.IsAny<Domain.Entities.TopUpRequest>()), Times.Once);

            _mocker.GetMock<IUnitOfWork>()
                .Verify(x => x.SaveChangesAsync(), Times.Once);
        }
    }
}