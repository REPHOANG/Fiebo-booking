using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.FinanceAdmin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class FinanceAdminService : IFinanceAdminService
    {
        private readonly IIdentityService _identityService;
        private readonly IUnitOfWork _unitOfWork;

        public FinanceAdminService(IIdentityService identityService, IUnitOfWork unitOfWork)
        {
            _identityService = identityService;
            _unitOfWork = unitOfWork;
        }

        public async Task<List<FinanceAdminListResponse>> GetFinanceAdminListAsync()
        {
            var users = await _identityService.GetUsersByRoleAsync(AppRoles.FinanceAdmin);

            var response = users.Select(u => new FinanceAdminListResponse
            {
                Id = u.Id,
                FullName = u.FullName ?? "",
                Username = u.Email?.Replace("@fiebo.com", "") ?? "",
                Status = u.Status ?? ""
            }).ToList();

            return response;
        }

        public async Task<bool> CreateFinanceAdminAsync(CreateFinanceAdminRequest request)
        {
            var fakeEmail = $"{request.Username.Trim().ToLower()}@fiebo.com";

            var createResult = await _identityService.CreateUserAsync(
                fakeEmail,
                null!,
                request.Password,
                request.FullName,
                AppRoles.FinanceAdmin,
                null
            );

            if (!createResult.IsSuccess)
            {
                if (createResult.ErrorMessage.Contains("already taken") || createResult.ErrorMessage.Contains("đã tồn tại"))
                {
                    throw new ResourceConflictException("Tên đăng nhập đã tồn tại trong hệ thống (MSG104).");
                }

                throw new BadRequestException($"Tạo tài khoản thất bại (MSG105): {createResult.ErrorMessage}");
            }

            var active = await _identityService.ActivateUserAsync(fakeEmail);
            if (!active)
            {
                throw new BadRequestException("Kích hoạt tài khoản thất bại.");
            }

            return true;
        }

        public async Task<PagedResult<PaymentTransactionResponse>> GetPaymentTransactionAsync(int page, int pageSize, TransactionFilter filter)
        {
            TransactionType? transactionType = null;
            TransactionStatus? transactionStatus = null;
            if (!string.IsNullOrEmpty(filter.Type))
            {
                if (!Enum.TryParse<TransactionType>(filter.Type, true, out var parsedType))
                {
                    throw new BadRequestException("TransactionType không hợp lệ");
                }
                transactionType = parsedType;
            }
            if (!string.IsNullOrEmpty(filter.Status))
            {
                if (!Enum.TryParse<TransactionStatus>(filter.Status, true, out var parsedStatus))
                {
                    throw new BadRequestException("TransactionStatus không hợp lệ");
                }
                transactionStatus = parsedStatus;
            }
            var transactions = await _unitOfWork.WalletTransactions.GetPaymentTransaction(page, pageSize, filter.From, filter.To, transactionType, filter.Name, transactionStatus);
            return transactions;
        }

        public async Task<PaymentTransactionDetailResponse> GetPaymentTransactionDetailAsync(int id)
        {
            var transaction = await _unitOfWork.WalletTransactions.GetByIdAsync(id) ?? throw new NotFoundException("Giao dịch không tồn tại");
            var wallet = await _unitOfWork.Wallets.GetByIdAsync(transaction.WalletId) ?? throw new NotFoundException("Ví không tồn tại");
            var user = await _identityService.GetUserProfileAsync(wallet.UserId) ?? throw new NotFoundException("Người dùng không tồn tại");
            var bankInfo = (await _unitOfWork.UserBankAccounts.FindAsync(b => b.UserId == user.Id)).FirstOrDefault();

            return new PaymentTransactionDetailResponse
            {
                Id = transaction.Id,
                Fullname = user.FullName ?? "",
                PhoneNumber = user.PhoneNumber ?? "",
                Email = user.Email ?? "",
                BankAccountNumber = bankInfo?.AccountNumber ?? "",
                BankName = bankInfo?.BankName ?? "",
                BankaccountHolder = bankInfo?.AccountHolderName ?? "",
                Description = transaction.Description,
                ReferenceId = transaction.ReferenceId,
                Direction = transaction.Direction.ToString(),
                TransactionType = transaction.TransactionType.ToString(),
                Amount = transaction.Amount,
                Status = transaction.Status.ToString(),
                CreatedAt = transaction.CreatedAt,
            };
        }

        public async Task<PagedResult<PayoutBatchResponse>> GetPayoutBatchesAsync(int page, int pageSize, int? year, int? month, string? status)
        {
            PayoutStatus? payoutStatus = null;
            if(!string.IsNullOrEmpty(status))
            {
                if (!Enum.TryParse<PayoutStatus>(status, true, out var parsedPayoutStatus))
                {
                    throw new BadRequestException("PayoutStatus không hợp lệ");
                }
                payoutStatus = parsedPayoutStatus;
            }
           
            var payoutBatches = await _unitOfWork.PayoutBatches.GetPayoutBatchesAsync(page, pageSize, year, month, payoutStatus);
            return new PagedResult<PayoutBatchResponse>
            {
                Page = payoutBatches.Page,
                PageSize = payoutBatches.PageSize,
                TotalItems = payoutBatches.TotalItems,
                Items = [.. payoutBatches.Items.Select(pb => new PayoutBatchResponse
                {
                    Id = pb.Id,
                    FromDate = pb.FromDate,
                    ToDate = pb.ToDate,
                    TotalAmount = pb.TotalAmount,
                    Status = pb.Status.ToString(),
                    CreatedAt = pb.CreatedAt,
                    UpdatedAt = pb.UpdatedAt
                })]
            };
        }

        public async Task<PagedResult<PayoutResponse>> GetPayoutsByBatchIdAsync(int batchId, int page, int pageSize, string? name, string? status)
        {
            PayoutStatus? payoutStatus = null;
            if(!string.IsNullOrEmpty(status))
            {
                if (!Enum.TryParse<PayoutStatus>(status, true, out var parsedPayoutStatus))
                {
                    throw new BadRequestException("PayoutStatus không hợp lệ");
                }
                payoutStatus = parsedPayoutStatus;
            }
            
            return await _unitOfWork.Payouts.GetPayoutsByBatchIdAsync(batchId, page, pageSize, name, payoutStatus);
        }

        public async Task<PayoutDetailResponse> GetPayoutDetailAsync(int payoutId)
        {
            var payout = await _unitOfWork.Payouts.GetByIdAsync(payoutId) ?? throw new NotFoundException("Payout không tồn tại");
            var user = await _identityService.GetUserProfileAsync(payout.OwnerId) ?? throw new NotFoundException("Người dùng không tồn tại");
            var bankInfo = (await _unitOfWork.UserBankAccounts.FindAsync(b => b.UserId == payout.OwnerId)).FirstOrDefault();
            var payoutDetails = await _unitOfWork.PayoutDetails.GetPayoutDetailByIdAsync(payoutId);
            return new PayoutDetailResponse
            {
                Id = payout.Id,
                PayoutId = payout.Id,
                OwnerName = user.FullName ?? "",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber ?? "",
                BankAccountName = bankInfo?.BankName ?? "",
                BankAccountNumber = bankInfo?.AccountNumber ?? "",
                BankAccountHolderName = bankInfo?.AccountHolderName ?? "",
                Amount = payout.Amount,
                Status = payout.Status.ToString(),
                Bookings = [.. payoutDetails.Select(d => new PayoutBookingItem
                {
                    VenueId = d.Booking?.VenueId ?? 0,
                    VenueName = d.Booking?.Venue?.Name ?? "",
                    BookingId = d.BookingId,
                    EventId = d.EventId,
                    Date = d.PayoutDetailType == PayoutDetailType.Booking ? d.Booking?.BookingDate : d.Event?.EventDate,
                    PayoutDetailType = d.PayoutDetailType.ToString(),
                    Amount = d.Amount,
                    Status = d.Booking?.Status.ToString() ?? ""
                })]
            };
        }
        public async Task<bool> StartProcessingPayoutBatchAsync(int batchId, string adminId)
        {
            var success = await _unitOfWork.PayoutBatches.StartProcessingBatchAsync(batchId, adminId);
            if (!success)
            {
                throw new NotFoundException("Batch thanh toán không tồn tại hoặc không ở trạng thái Pending.");
            }
            return true;
        }

        public async Task<bool> CompletePayoutBatchAsync(int batchId, string adminId)
        {
            var success = await _unitOfWork.PayoutBatches.MarkBatchAsCompletedAsync(batchId, adminId);
            if (!success)
            {
                throw new NotFoundException("Batch thanh toán không tồn tại hoặc đã được hoàn tất trước đó.");
            }
            return true;
        }
    }
}