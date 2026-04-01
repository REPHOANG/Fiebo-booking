using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Fiebo.Application.Services
{
    public class WalletService : IWalletService
    {
        private readonly IUnitOfWork _unitOfWork;
        private IQrPaymentService _qrPaymentService;
        private readonly INotificationService _notificationService;
        private readonly IPayoutService _payoutService;
        private readonly ILogger<WalletService> _logger;

        private const decimal CustomerMinWithdraw = 10_000m;
        private const decimal OwnerMinWithdraw = 100_000m;

        public WalletService(
            IUnitOfWork unitOfWork,
            IQrPaymentService qrPaymentService,
            INotificationService notificationService,
            IPayoutService payoutService,
            ILogger<WalletService> logger
                        )
        {
            _unitOfWork = unitOfWork;
            _qrPaymentService = qrPaymentService;
            _notificationService = notificationService;
            _payoutService = payoutService;
            _logger = logger;
        }

        public async Task<QrPaymentResponseDto> GenerateTopUpQrAsync(decimal amount, string userId)
        {
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
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
                throw new NotFoundException("Không tìm thấy ví.");
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
                throw new NotFoundException("Không có dữ liệu hợp lệ.");
            }
            var wallet = await _unitOfWork.Wallets.GetByIdAsync(topUpRequest.WalletId);
            if (wallet == null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
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
                    ReferenceId = topUpRequest.Id
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

        public async Task<WithdrawResponse> WithdrawAsync(string userId, string userRole, WithdrawRequest request)
        {
            // Step 5 / E2: Role-based minimum limit validation
            decimal minAmount = userRole == AppRoles.FieldOwner ? OwnerMinWithdraw : CustomerMinWithdraw;
            if (request.Amount < minAmount)
            {
                throw new BadRequestException(
                    $"Số tiền rút không hợp lệ. Mức rút tối thiểu là {minAmount:N0} VNĐ.");
            }

            // Fetch wallet
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
            }

            // Step 4 / E3: Check for existing pending withdrawal (spam prevention)
            var hasPending = await _unitOfWork.WalletTransactions.HasPendingWithdrawalAsync(wallet.Id);
            if (hasPending)
            {
                throw new BadRequestException(
                    "Bạn đang có một lệnh rút tiền chờ xử lý. Vui lòng đợi lệnh này hoàn tất trước khi tạo lệnh mới.");
            }

            // Verify bank account belongs to user
            var bankAccount = await _unitOfWork.UserBankAccounts.GetByIdAndUserAsync(request.BankAccountId, userId);
            if (bankAccount == null)
            {
                throw new NotFoundException("Tài khoản ngân hàng không tồn tại hoặc không thuộc về bạn.");
            }

            // Step 6-10: ACID Transaction
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                // E1: Balance check (inside transaction for consistency)
                if (wallet.Balance < request.Amount)
                {
                    throw new BadRequestException(
                        "Số dư khả dụng không đủ. Vui lòng kiểm tra lại số dư hoặc các giao dịch gần đây.");
                }

                // Step 7: Deduct balance
                wallet.Balance -= request.Amount;
                _unitOfWork.Wallets.Update(wallet);

                // Step 8: Create WalletTransaction with Pending status
                var transaction = new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = request.Amount,
                    Direction = TransactionDirection.Debit,
                    TransactionType = TransactionType.Withdraw,
                    Status = TransactionStatus.Pending,
                    Description = $"Rút tiền về TK {bankAccount.BankName} - {bankAccount.AccountNumber}",
                    CreatedAt = DateTime.Now
                };
                _unitOfWork.WalletTransactions.Add(transaction);

                // Step 6 / E4: SaveChanges — will throw DbUpdateConcurrencyException if RowVersion mismatch
                await _unitOfWork.SaveChangesAsync();

                // Step 10: Commit
                await _unitOfWork.CommitTransactionAsync();

                _logger.LogInformation(
                    "Withdrawal request created. UserId: {UserId}, Amount: {Amount}, TransactionId: {TxId}",
                    userId, request.Amount, transaction.Id);

                // Step 9: Fire payout (mock — fire-and-forget style)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _payoutService.ProcessPayoutAsync(
                            transaction.Id,
                            request.Amount,
                            bankAccount.BankName,
                            bankAccount.AccountNumber,
                            bankAccount.AccountHolderName);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Payout processing failed for TransactionId: {TxId}", transaction.Id);
                    }
                });

                return new WithdrawResponse
                {
                    TransactionId = transaction.Id,
                    Amount = request.Amount,
                    RemainingBalance = wallet.Balance,
                    Status = TransactionStatus.Pending.ToString(),
                    Message = "Yêu cầu rút tiền đã được ghi nhận. Số tiền sẽ được chuyển về tài khoản của bạn trong thời gian sớm nhất."
                };
            }
            catch (DbUpdateConcurrencyException)
            {
                // E4: Race condition — another transaction modified the wallet concurrently
                await _unitOfWork.RollbackTransactionAsync();
                _logger.LogWarning("Concurrency conflict on withdrawal for UserId: {UserId}", userId);
                throw new BadRequestException(
                    "Giao dịch không thành công do xung đột dữ liệu. Vui lòng thử lại.");
            }
            catch (BadRequestException)
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
            catch (Exception)
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }
    }
}
