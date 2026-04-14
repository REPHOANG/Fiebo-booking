using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class WalletService : IWalletService
    {
        private readonly IUnitOfWork _unitOfWork;
        private IQrPaymentService _qrPaymentService;
        private readonly INotificationService _notificationService;
        private readonly IPayoutService _payoutService;
        private readonly ILogger<WalletService> _logger;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        private const decimal CustomerMinWithdraw = 10_000m;
        private const decimal OwnerMinWithdraw = 100_000m;
        private const decimal CustomerAutoPayoutLimit = 1_000_000m;

        public WalletService(
            IUnitOfWork unitOfWork,
            IQrPaymentService qrPaymentService,
            INotificationService notificationService,
            IPayoutService payoutService,
            ILogger<WalletService> logger,
            IServiceScopeFactory serviceScopeFactory
                        )
        {
            _unitOfWork = unitOfWork;
            _qrPaymentService = qrPaymentService;
            _notificationService = notificationService;
            _payoutService = payoutService;
            _logger = logger;
            _serviceScopeFactory = serviceScopeFactory;
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
            if(topUpRequest.Amount != request.TransferAmount)
            {
                throw new BadRequestException("Số tiền nạp không khớp.");
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

                // Step 9: Routing logic (Auto-Payout vs Admin Review)
                // bool isAutoPayoutEligible = userRole == AppRoles.Customer && request.Amount < CustomerAutoPayoutLimit;

                // if (isAutoPayoutEligible)
                // {
                //     _logger.LogInformation(
                //         "Auto-payout triggered for Customer. UserId: {UserId}, Amount: {Amount}, TransactionId: {TxId}",
                //         userId, request.Amount, transaction.Id);

                //     // Fire payout (mock — fire-and-forget style)
                //     _ = Task.Run(async () =>
                //     {
                //         using var scope = _serviceScopeFactory.CreateScope();
                //         var scopedUow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                //         var scopedPayoutService = scope.ServiceProvider.GetRequiredService<IPayoutService>();
                //         var scopedLogger = scope.ServiceProvider.GetRequiredService<ILogger<WalletService>>();

                //         try
                //         {
                //             bool payoutSuccess = await scopedPayoutService.ProcessPayoutAsync(
                //                 transaction.Id,
                //                 request.Amount,
                //                 bankAccount.BankName,
                //                 bankAccount.AccountNumber,
                //                 bankAccount.AccountHolderName);

                //             if (payoutSuccess)
                //             {
                //                 var txToUpdate = await scopedUow.WalletTransactions.GetByIdAsync(transaction.Id);
                //                 if (txToUpdate != null)
                //                 {
                //                     txToUpdate.Status = TransactionStatus.Success;
                //                     scopedUow.WalletTransactions.Update(txToUpdate);
                //                     await scopedUow.SaveChangesAsync();
                //                     scopedLogger.LogInformation("Auto-payout succeeded and status updated to Success for TxId: {TxId}", transaction.Id);
                //                 }
                //             }
                //         }
                //         catch (Exception ex)
                //         {
                //             scopedLogger.LogError(ex, "Auto-payout processing failed for TransactionId: {TxId}", transaction.Id);
                //         }
                //     });

                //     return new WithdrawResponse
                //     {
                //         TransactionId = transaction.Id,
                //         Amount = request.Amount,
                //         RemainingBalance = wallet.Balance,
                //         Status = TransactionStatus.Pending.ToString(),
                //         Message = "Yêu cầu rút tiền đang được hệ thống xử lý tự động. Vui lòng kiểm tra lại trạng thái sau ít phút."
                //     };
                // }
                // else
                // {
                    _logger.LogInformation(
                        "Withdrawal request queued for Finance Admin Review (Not eligible for Auto-Payout). UserId: {UserId}, Role: {Role}, Amount: {Amount}, TransactionId: {TxId}",
                        userId, userRole, request.Amount, transaction.Id);

                    return new WithdrawResponse
                    {
                        TransactionId = transaction.Id,
                        Amount = request.Amount,
                        RemainingBalance = wallet.Balance,
                        Status = TransactionStatus.Pending.ToString(),
                        Message = "Yêu cầu rút tiền đã được gửi tới Quản trị viên để xét duyệt. Thời gian xử lý dự kiến từ 24h-48h làm việc."
                    };
                // }
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

        public async Task<IEnumerable<BankAccountResponse>> GetUserBankAccountsAsync(string userId)
        {
            var accounts = await _unitOfWork.UserBankAccounts.FindAsync(x => x.UserId == userId);
            return accounts.Select(x => new BankAccountResponse
            {
                Id = x.Id,
                BankName = x.BankName,
                AccountNumber = x.AccountNumber,
                AccountHolderName = x.AccountHolderName
            });
        }

        public async Task<BankAccountResponse> CreateBankAccountAsync(string userId, CreateBankAccountRequest request)
        {
            var account = new UserBankAccount
            {
                UserId = userId,
                BankName = request.BankName,
                AccountNumber = request.AccountNumber,
                AccountHolderName = request.AccountHolderName,
                CreatedAt = DateTime.Now
            };

            _unitOfWork.UserBankAccounts.Add(account);
            await _unitOfWork.SaveChangesAsync();

            return new BankAccountResponse
            {
                Id = account.Id,
                BankName = account.BankName,
                AccountNumber = account.AccountNumber,
                AccountHolderName = account.AccountHolderName
            };
        }

        public async Task UpdateBankAccountAsync(string userId, int id, UpdateBankAccountRequest request)
        {
            var account = await _unitOfWork.UserBankAccounts.GetByIdAndUserAsync(id, userId);
            if (account == null)
            {
                throw new NotFoundException("Không tìm thấy tài khoản ngân hàng hoặc bạn không có quyền chỉnh sửa.");
            }

            account.BankName = request.BankName;
            account.AccountNumber = request.AccountNumber;
            account.AccountHolderName = request.AccountHolderName;
            account.UpdatedAt = DateTime.Now;

            _unitOfWork.UserBankAccounts.Update(account);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteBankAccountAsync(string userId, int id)
        {
            var account = await _unitOfWork.UserBankAccounts.GetByIdAndUserAsync(id, userId);
            if (account == null)
            {
                throw new NotFoundException("Không tìm thấy tài khoản ngân hàng hoặc bạn không có quyền xóa.");
            }

            _unitOfWork.UserBankAccounts.Remove(account);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
