using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class WalletService : IWalletService
    {
        private readonly IUnitOfWork _unitOfWork;
        private IQrPaymentService _qrPaymentService;
        private readonly INotificationService _notificationService;
        public WalletService(
            IUnitOfWork unitOfWork,
            IQrPaymentService qrPaymentService,
            INotificationService notificationService
                        )
        {
            _unitOfWork = unitOfWork;
            _qrPaymentService = qrPaymentService;
            _notificationService = notificationService;
        }

        public async Task<QrPaymentResponseDto> GenerateTopUpQrAsync(decimal amount, string userId)
        {
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Wallet is not found");
            }
            var topUpRequest = new Domain.Entities.TopUpRequest
            {
                WalletId = wallet.Id,
                Amount = amount,
                Status = TopUpStatus.Pending,
            };
            _unitOfWork.TopUpRequests.Add(topUpRequest);
            await _unitOfWork.SaveChangesAsync();
            return _qrPaymentService.GenerateQrPayment(amount, topUpRequest.Id);
        }

        public async Task<decimal> GetBalanceAsync(string userId)
        {
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Wallet is not found");
            }
            return wallet?.Balance ?? 0;
        }

        public async Task<bool> TopUpWalletAsync(SepayWebhookRequest request)
        {
            if (request.TransferType != "in")
            {
                return true;
            }
            var topUpId = int.Parse(request.Content.Replace("FIEBOTU", ""));
            var topUpRequest = await _unitOfWork.TopUpRequests.GetByIdAsync(topUpId);
            if (topUpRequest == null)
            {
                throw new NotFoundException("Top-up request is not found");
            }
            var wallet = await _unitOfWork.Wallets.GetByIdAsync(topUpRequest.WalletId);
            if (wallet == null)
            {
                throw new NotFoundException("Wallet is not found");
            }
            if (topUpRequest.Status == TopUpStatus.Paid)
            {
                return true;
            }
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                wallet.Balance += topUpRequest.Amount;
                topUpRequest.Status = TopUpStatus.Paid;
                topUpRequest.PaidAt = DateTime.Now;
                _unitOfWork.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = topUpRequest.Amount,
                    Direction = TransactionDirection.Credit,
                    TransactionType = TransactionType.TopUp,
                });
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
            await _notificationService.NotifyWalletTopupAsync(wallet.UserId, request.TransferAmount);
            return true;
        }

        public async Task<PagedResult<WalletTransactionResponse>> GetWalletTransactionsAsync(string userId, int pageNumber, int pageSize, DateTime? from, DateTime? to)
        {
            to ??= DateTime.Today;
            from ??= to.Value.AddDays(-7);

            var fromDate = from.Value.Date;
            var toDate = to.Value.Date.AddDays(1);

            if (fromDate >= toDate)
            {
                throw new BadRequestException("From date must be less than to date");
            }
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Wallet is not found");
            }
            if (wallet.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to access this wallet");
            }
            var walletTransactions = await _unitOfWork.WalletTransactions
                .GetTransactionsByWalletIdAsync(wallet.Id, pageNumber, pageSize, fromDate, toDate);
            var items = walletTransactions.Items.Select(wt => new WalletTransactionResponse
            {
                Id = wt.Id,
                Amount = wt.Amount,
                Direction = wt.Direction.ToString(),
                TransactionType = wt.TransactionType.ToString(),
                ReferenceId = wt.ReferenceId,
                CreatedAt = wt.CreatedAt
            }).ToList();
            return new PagedResult<WalletTransactionResponse>
            {
                Page = walletTransactions.Page,
                PageSize = walletTransactions.PageSize,
                TotalItems = walletTransactions.TotalItems,
                Items = items
            };

        }
    }
}
