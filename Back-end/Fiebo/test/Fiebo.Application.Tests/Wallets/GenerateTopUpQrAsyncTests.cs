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
        public async Task GenerateTopUpQrAsync_ShouldReturnQr_WhenWalletExists()
        {
            // Arrange

            var wallet = new Wallet
            {
                Id = 1,
                UserId = "user1",
                Balance = 0,
                CreatedDate = DateTime.UtcNow,
                WalletTransactions = [],
                TopUpRequests = []
            };

            var qrResponse = new QrPaymentResponseDto
            {
                QrImageUrl = "QR_TEST",
                BankName = "Test Bank",
                AccountName = "Test Account",
                AccountNumber = "123456789",
                TransferContent = "FIEBOTU1"
            };

            _mocker.GetMock<IUnitOfWork>()
                .Setup(x => x.Wallets.GetByUserId("user1"))
                .ReturnsAsync(wallet);

            _mocker.GetMock<IQrPaymentService>()
                .Setup(x => x.GenerateQrPayment(It.IsAny<decimal>(), It.IsAny<int>()))
                .Returns(qrResponse);

            // Act
            var result = await _walletService.GenerateTopUpQrAsync(100, "user1");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("QR_TEST", result.QrImageUrl);
            Assert.Equal("Test Bank", result.BankName);

            _mocker.GetMock<IUnitOfWork>()
                .Verify(x => x.TopUpRequests.Add(It.IsAny<Domain.Entities.TopUpRequest>()), Times.Once);

            _mocker.GetMock<IUnitOfWork>()
                .Verify(x => x.SaveChangesAsync(), Times.Once);
        }
    }
}