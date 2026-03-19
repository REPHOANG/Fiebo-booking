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
    public class TopUpWalletAsyncTests
    {
        private readonly AutoMocker _mocker;
        private readonly WalletService _walletService;

        public TopUpWalletAsyncTests()
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
        public async Task TopUpWalletAsync_ShouldIgnore_WhenTransferTypeNotIn()
        {
            // Arrange
            var request = new SepayWebhookRequest
            {
                TransferType = "out"
            };

            // Act
            var result = await _walletService.TopUpWalletAsync(request);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task TopUpWalletAsync_ShouldThrow_WhenTopUpRequestNotFound()
        {
            // Arrange
            var request = new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 100
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests.GetByIdAsync(1))
                .ReturnsAsync((Domain.Entities.TopUpRequest)null!);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _walletService.TopUpWalletAsync(request));
        }

        [Fact]
        public async Task TopUpWalletAsync_ShouldThrow_WhenWalletNotFound()
        {
            // Arrange
            var request = new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 100
            };

            var topUpRequest = new Domain.Entities.TopUpRequest
            {
                Id = 1,
                WalletId = 10,
                Amount = 100,
                Status = TopUpStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests.GetByIdAsync(1))
                .ReturnsAsync(topUpRequest);

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByIdAsync(10))
                .ReturnsAsync((Wallet)null!);

            // Act & Assert
            await Assert.ThrowsAsync<NotFoundException>(() =>
                _walletService.TopUpWalletAsync(request));
        }

        [Fact]
        public async Task TopUpWalletAsync_ShouldReturnTrue_WhenAlreadyPaid()
        {
            // Arrange
            var request = new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 100
            };

            var topUpRequest = new Domain.Entities.TopUpRequest
            {
                Id = 1,
                WalletId = 10,
                Amount = 100,
                Status = TopUpStatus.Paid,
                CreatedAt = DateTime.UtcNow
            };

            var wallet = new Wallet
            {
                Id = 10,
                UserId = "user1",
                Balance = 500,
                Transactions = new List<WalletTransaction>(),
                TopUpRequests = new List<Domain.Entities.TopUpRequest>()
            };

            // tạo repo mock
            var topUpRepo = new Mock<ITopUpRequestRepository>();
            var walletRepo = new Mock<IWalletRepository>();

            topUpRepo
                .Setup(x => x.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(topUpRequest);

            walletRepo
                .Setup(x => x.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(wallet);

            // gắn repo vào UnitOfWork
            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests)
                .Returns(topUpRepo.Object);

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets)
                .Returns(walletRepo.Object);

            // Act
            var result = await _walletService.TopUpWalletAsync(request);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task TopUpWalletAsync_ShouldTopUpSuccessfully()
        {
            // Arrange
            var request = new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 100
            };

            var topUpRequest = new Domain.Entities.TopUpRequest
            {
                Id = 1,
                WalletId = 10,
                Amount = 100,
                Status = TopUpStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            var wallet = new Wallet
            {
                Id = 10,
                UserId = "user1",
                Balance = 0,
                Transactions = new List<WalletTransaction>(),
                TopUpRequests = new List<Domain.Entities.TopUpRequest>()
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.TopUpRequests.GetByIdAsync(1))
                .ReturnsAsync(topUpRequest);

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByIdAsync(10))
                .ReturnsAsync(wallet);

            // Act
            var result = await _walletService.TopUpWalletAsync(request);

            // Assert
            Assert.True(result);
            Assert.Equal(100, wallet.Balance);

            _mocker.GetMock<IUnitOfWork>()
                .Verify(x => x.WalletTransactions.Add(It.IsAny<WalletTransaction>()), Times.Once);

            _mocker.GetMock<INotificationService>()
                .Verify(x => x.NotifyWalletTopupAsync("user1", 100), Times.Once);
        }
    }
}