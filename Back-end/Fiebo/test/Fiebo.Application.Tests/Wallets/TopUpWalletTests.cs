using AutoFixture;
using AutoFixture.AutoMoq;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using DomainTopUpRequest = Fiebo.Domain.Entities.TopUpRequest;
using Xunit;

namespace Fiebo.Application.Tests.Wallets
{
    public class TopUpWalletTests
    {
        private readonly IFixture _fixture;

        public TopUpWalletTests()
        {
            _fixture = new Fixture()
                .Customize(new AutoMoqCustomization
                {
                    ConfigureMembers = true
                });
        }

        private WalletService CreateService()
        {
            return _fixture.Create<WalletService>();
        }

        private void SetupRepositories(
            Mock<ITopUpRequestRepository> topUpRepoMock,
            Mock<IWalletRepository> walletRepoMock,
            Mock<IWalletTransactionRepository> walletTxRepoMock)
        {
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            uowMock.Setup(x => x.TopUpRequests).Returns(topUpRepoMock.Object);
            uowMock.Setup(x => x.Wallets).Returns(walletRepoMock.Object);
            uowMock.Setup(x => x.WalletTransactions).Returns(walletTxRepoMock.Object);

            _fixture.Freeze<Mock<ILogger<WalletService>>>();
            _fixture.Freeze<Mock<IQrPaymentService>>();
            _fixture.Freeze<Mock<INotificationService>>();
            _fixture.Freeze<Mock<IPayoutService>>();
            _fixture.Freeze<Mock<IServiceScopeFactory>>();
        }

        [Fact]
        public async Task Should_ReturnTrue_WhenTransferTypeIsNotIn()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            var request = new SepayWebhookRequest
            {
                TransferType = "out",
                Content = "FIEBOTU1",
                TransferAmount = 100000m
            };

            var service = CreateService();
            var result = await service.TopUpWalletAsync(request);

            Assert.True(result);
            topUpRepoMock.Verify(x => x.GetByIdAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task Should_ThrowFormatException_WhenContentInvalid()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            var request = new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "INVALID",
                TransferAmount = 100000m
            };

            var service = CreateService();

            await Assert.ThrowsAsync<FormatException>(async () =>
                await service.TopUpWalletAsync(request));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenTopUpRequestNotFound()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            var request = InRequest();
            topUpRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync((DomainTopUpRequest?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.TopUpWalletAsync(request));
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenWalletNotFound()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            topUpRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(PendingTopUp());
            walletRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync((Wallet?)null);

            var service = CreateService();

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.TopUpWalletAsync(InRequest()));
        }

        [Fact]
        public async Task Should_ReturnTrue_WhenTopUpAlreadyPaid()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var notifyMock = _fixture.Freeze<Mock<INotificationService>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            var paidTopUp = PendingTopUp();
            paidTopUp.Status = TopUpStatus.Paid;

            topUpRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(paidTopUp);
            walletRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ExistingWallet());

            var service = CreateService();
            var result = await service.TopUpWalletAsync(InRequest());

            Assert.True(result);
            uowMock.Verify(x => x.BeginTransactionAsync(), Times.Never);
            walletTxRepoMock.Verify(x => x.Add(It.IsAny<WalletTransaction>()), Times.Never);
            notifyMock.Verify(x => x.NotifyWalletTopupAsync(It.IsAny<string>(), It.IsAny<decimal>()), Times.Never);
        }

        [Fact]
        public async Task Should_TopUpWallet_WhenRequestValid()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            var notifyMock = _fixture.Freeze<Mock<INotificationService>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            var topUp = PendingTopUp();
            var wallet = ExistingWallet();

            topUpRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(topUp);
            walletRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(wallet);

            WalletTransaction? tx = null;
            walletTxRepoMock
                .Setup(x => x.Add(It.IsAny<WalletTransaction>()))
                .Callback<WalletTransaction>(w => tx = w);

            var service = CreateService();
            var result = await service.TopUpWalletAsync(InRequest());

            Assert.True(result);
            Assert.Equal(400000m, wallet.Balance);
            Assert.Equal(TopUpStatus.Paid, topUp.Status);
            Assert.True(topUp.PaidAt.HasValue);
            Assert.NotNull(tx);
            Assert.Equal(wallet.Id, tx.WalletId);
            Assert.Equal(topUp.Amount, tx.Amount);
            Assert.Equal(TransactionDirection.Credit, tx.Direction);
            Assert.Equal(TransactionType.TopUp, tx.TransactionType);
            Assert.Equal(topUp.Id, tx.ReferenceId);

            uowMock.Verify(x => x.BeginTransactionAsync(), Times.Once);
            uowMock.Verify(x => x.SaveChangesAsync(), Times.Once);
            uowMock.Verify(x => x.CommitTransactionAsync(), Times.Once);
            notifyMock.Verify(x => x.NotifyWalletTopupAsync("user-1", 100000m), Times.Once);
        }

        [Fact]
        public async Task Should_Rollback_WhenSaveChangesThrows()
        {
            var topUpRepoMock = _fixture.Freeze<Mock<ITopUpRequestRepository>>();
            var walletRepoMock = _fixture.Freeze<Mock<IWalletRepository>>();
            var walletTxRepoMock = _fixture.Freeze<Mock<IWalletTransactionRepository>>();
            var uowMock = _fixture.Freeze<Mock<IUnitOfWork>>();
            SetupRepositories(topUpRepoMock, walletRepoMock, walletTxRepoMock);

            topUpRepoMock.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(PendingTopUp());
            walletRepoMock.Setup(x => x.GetByIdAsync(10)).ReturnsAsync(ExistingWallet());
            uowMock.Setup(x => x.SaveChangesAsync()).ThrowsAsync(new Exception("db error"));

            var service = CreateService();

            await Assert.ThrowsAsync<Exception>(async () =>
                await service.TopUpWalletAsync(InRequest()));

            uowMock.Verify(x => x.RollbackTransactionAsync(), Times.Once);
            uowMock.Verify(x => x.CommitTransactionAsync(), Times.Never);
        }

        private static SepayWebhookRequest InRequest()
        {
            return new SepayWebhookRequest
            {
                TransferType = "in",
                Content = "FIEBOTU1",
                TransferAmount = 100000m
            };
        }

        private static DomainTopUpRequest PendingTopUp()
        {
            return new DomainTopUpRequest
            {
                Id = 1,
                WalletId = 10,
                Amount = 100000m,
                Status = TopUpStatus.Pending,
                Wallet = null!
            };
        }

        private static Wallet ExistingWallet()
        {
            return new Wallet
            {
                Id = 10,
                UserId = "user-1",
                Balance = 300000m
            };
        }
    }
}
