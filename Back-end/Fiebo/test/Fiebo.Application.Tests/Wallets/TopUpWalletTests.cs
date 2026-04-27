using System;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using TopUpRequestEntity = Fiebo.Domain.Entities.TopUpRequest;

namespace Fiebo.Application.Tests.Wallets
{
    public class TopUpWalletTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock;
        private readonly Mock<IQrPaymentService> _qrPaymentMock;
        private readonly Mock<INotificationService> _notificationMock;
        private readonly Mock<IPayoutService> _payoutMock;
        private readonly Mock<ILogger<WalletService>> _loggerMock;
        private readonly Mock<IServiceScopeFactory> _scopeFactoryMock;

        private readonly Mock<ITopUpRequestRepository> _topUpRepoMock;
        private readonly Mock<IWalletRepository> _walletRepoMock;
        private readonly Mock<IWalletTransactionRepository> _transactionRepoMock;

        private readonly WalletService _walletService;

        public TopUpWalletTests()
        {
            _unitOfWorkMock = new Mock<IUnitOfWork>();
            _qrPaymentMock = new Mock<IQrPaymentService>();
            _notificationMock = new Mock<INotificationService>();
            _payoutMock = new Mock<IPayoutService>();
            _loggerMock = new Mock<ILogger<WalletService>>();
            _scopeFactoryMock = new Mock<IServiceScopeFactory>();

            _topUpRepoMock = new Mock<ITopUpRequestRepository>();
            _walletRepoMock = new Mock<IWalletRepository>();
            _transactionRepoMock = new Mock<IWalletTransactionRepository>();

            _unitOfWorkMock.Setup(u => u.TopUpRequests).Returns(_topUpRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.Wallets).Returns(_walletRepoMock.Object);
            _unitOfWorkMock.Setup(u => u.WalletTransactions).Returns(_transactionRepoMock.Object);

            _walletService = new WalletService(
                _unitOfWorkMock.Object,
                _qrPaymentMock.Object,
                _notificationMock.Object,
                _payoutMock.Object,
                _loggerMock.Object,
                _scopeFactoryMock.Object);
        }

        private SepayWebhookRequest CreateValidRequest()
        {
            return new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 50000
            };
        }

        [Fact]
        public async Task UTCID_01_Should_Throw_BadRequestException_When_TopUpRequest_Not_Found()
        {
            // Arrange
            var request = CreateValidRequest();
            request.Content = "FIEBOTU999";
            _topUpRepoMock.Setup(u => u.GetByIdAsync(999)).ReturnsAsync((Domain.Entities.TopUpRequest)null);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _walletService.TopUpWalletAsync(request));
            Assert.Equal("Không có dữ liệu hợp lệ.", ex.Message);
        }

        [Fact]
        public async Task UTCID_02_Should_TopUp_Successfully_When_Valid_Data()
        {
            // Arrange
            var request = CreateValidRequest();
            var topUpRequest = new Domain.Entities.TopUpRequest { Id = 1, WalletId = 10, Amount = 50000, Status = TopUpStatus.Pending };
            var wallet = new Wallet { Id = 10, UserId = "user-id", Balance = 100000 };

            _topUpRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(topUpRequest);
            _walletRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(wallet);

            // Act
            var result = await _walletService.TopUpWalletAsync(request);

            // Assert
            Assert.True(result);
            Assert.Equal(150000, wallet.Balance);
            Assert.Equal(TopUpStatus.Paid, topUpRequest.Status);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
            _notificationMock.Verify(n => n.NotifyWalletTopupAsync("user-id", 50000), Times.Once);
        }

        //[Fact]
        //public async Task UTCID_03_Should_Return_True_When_Already_Paid()
        //{
        //    // Arrange
        //    var request = CreateValidRequest();
        //    var topUpRequest = new Domain.Entities.TopUpRequest { Id = 1, WalletId = 10, Amount = 50000, Status = TopUpStatus.Paid };
            
        //    _topUpRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(topUpRequest);

        //    // Act
        //    var result = await _walletService.TopUpWalletAsync(request);

        //    // Assert
        //    Assert.True(result);
        //    _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Never);
        //}

        [Fact]
        public async Task UTCID_04_Should_Throw_BadRequestException_When_Amount_Mismatch_Low()
        {
            // Arrange
            var request = CreateValidRequest();
            request.TransferAmount = 49999;
            var topUpRequest = new Domain.Entities.TopUpRequest { Id = 1, WalletId = 10, Amount = 50000, Status = TopUpStatus.Pending };
            var wallet = new Wallet { Id = 10, Balance = 100000 };

            _topUpRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(topUpRequest);
            _walletRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(wallet);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _walletService.TopUpWalletAsync(request));
            Assert.Equal("Số tiền nạp không khớp.", ex.Message);
        }

        [Fact]
        public async Task UTCID_05_Should_Throw_BadRequestException_When_Amount_Mismatch_High()
        {
            // Arrange
            var request = CreateValidRequest();
            request.TransferAmount = 50001;
            var topUpRequest = new Domain.Entities.TopUpRequest { Id = 1, WalletId = 10, Amount = 50000, Status = TopUpStatus.Pending };
            var wallet = new Wallet { Id = 10, Balance = 100000 };

            _topUpRepoMock.Setup(u => u.GetByIdAsync(1)).ReturnsAsync(topUpRequest);
            _walletRepoMock.Setup(u => u.GetByIdAsync(10)).ReturnsAsync(wallet);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BadRequestException>(() => _walletService.TopUpWalletAsync(request));
            Assert.Equal("Số tiền nạp không khớp.", ex.Message);
        }
    }
}
