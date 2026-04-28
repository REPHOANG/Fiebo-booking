using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class PayoutService : IPayoutService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<PayoutService> _logger;
        private readonly IIdentityService _identityService;
        public PayoutService(IUnitOfWork unitOfWork, ILogger<PayoutService> logger, IIdentityService identityService)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _identityService = identityService;
        }
        public async Task<OwnerPayoutListResponse> GetOwnerPayoutsAsync(string? ownerId, int page, int pageSize, int? year, int? month)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem payout này");
            }
            var result = await _unitOfWork.Payouts.GetOwnerPayouts(ownerId, page, pageSize, year, month);
            return new OwnerPayoutListResponse
            {
                PendingPayout = result.Items
                .Where(i => i.Status == PayoutStatus.Pending
                || i.Status == PayoutStatus.Processing)
                .Sum(i => i.Amount),
                NextPayout = result.Items.Any()
                ? result.Items.Max(i => i.Batch.ToDate).AddDays(7)
                : null,
                Payouts = new PagedResult<OwnerPayoutsResponse>
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalItems = result.TotalItems,
                    Items = [.. result.Items.Select(i => new OwnerPayoutsResponse
                {
                    Id = i.Id,
                    FromDate = i.Batch.FromDate,
                    ToDate = i.Batch.ToDate,
                    Amount = i.Amount,
                    Status = i.Status.ToString()
                })]
                }
            };
        }

        public async Task<DetailedPayoutResponse> GetPayoutDetailAsync(int payoutId, string ownerId)
        {
            var payout = await _unitOfWork.Payouts.GetPayoutWithDetailsAsync(payoutId);
 
            if (payout == null)
            {
                throw new NotFoundException("Không tìm thấy chi tiết giao dịch. Liên kết có thể đã hết hạn hoặc bản ghi không tồn tại.");
            }
 
            if (payout.OwnerId != ownerId)
            {
                throw new ForbiddenException("Truy cập bị từ chối. Bạn không có thẩm quyền xem hồ sơ tài chính của giao dịch này.");
            }


            var bankAccount = await _unitOfWork.UserBankAccounts.GetSingleAsync(x => x.UserId == payout.OwnerId);
            
            var originalAccount = bankAccount?.AccountNumber ?? "N/A";

            var response = new DetailedPayoutResponse
            {
                GeneralInfo = new PayoutGeneralInfoDto
                {
                    CreatedAt = payout.CreatedAt,
                    Status = payout.Status.ToString(),
                    FailureReason = payout.FailureReason,
                    ProcessedAt = payout.UpdatedAt
                },
                FinancialSummary = new PayoutFinancialSummaryDto
                {
                    TotalAmount = payout.Amount,
                    BankName = bankAccount?.BankName ?? "N/A",
                    MaskedAccountNumber = originalAccount,
                    AccountHolderName = bankAccount?.AccountHolderName ?? "N/A"
                },
                FacilitiesBreakdown = payout.PayoutDetails
                    .Where(pd => pd.Booking != null)
                    .GroupBy(pd => new { pd.Booking!.VenueId, VenueName = pd.Booking.Venue.Name })
                    .Select(g => new VenuePayoutBreakdownDto
                    {
                        VenueId = g.Key.VenueId,
                        VenueName = g.Key.VenueName,
                        Subtotal = g.Sum(pd => pd.Amount),
                        Bookings = g.Select(pd => new PayoutBookingDetailDto
                        {
                            BookingId = pd.BookingId,
                            PlayDate = pd.Booking!.BookingDate,
                            SubFieldName = string.Join(", ", pd.Booking.BookingDetails.Select(bd => bd.Field.Name).Distinct()),
                            Amount = pd.Amount
                        }).ToList()
                    })
                    .ToList(),
                EventsBreakdown = payout.PayoutDetails
                    .Where(pd => pd.Event != null)
                    .Select(pd => new EventPayoutBreakdownDto
                    {
                        EventId = pd.EventId!.Value,
                        EventName = pd.Event!.Name,
                        EventDate = pd.Event.EventDate,
                        Amount = pd.Amount
                    })
                    .ToList()
            };
 
            return response;
        }
 
        public Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName)
        {
            throw new NotImplementedException();
        }

        public async Task<PagedResult<AdminPayoutListResponse>> GetAdminPayoutsAsync(int page, int pageSize, PayoutStatus? status, int? year, int? month)
        {
            var result = await _unitOfWork.Payouts.GetAdminPayoutsAsync(page, pageSize, status, year, month);
            return new PagedResult<AdminPayoutListResponse>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = result.Items.Select(p => new AdminPayoutListResponse
                {
                    Id = p.Id,
                    OwnerId = p.OwnerId,
                    FromDate = p.Batch.FromDate,
                    ToDate = p.Batch.ToDate,
                    Amount = p.Amount,
                    Status = p.Status.ToString(),
                    ProcessedAt = p.ProcessedAt,
                    ProcessedBy = p.ProcessedBy
                }).ToList()
            };
        }

        public async Task<bool> MarkPayoutAsCompletedAsync(int payoutId, string adminId)
        {
            var payout = await _unitOfWork.Payouts.GetByIdAsync(payoutId);

            if (payout == null)
                throw new NotFoundException("Không tìm thấy bản ghi thanh toán.");

            if (payout.Status != PayoutStatus.Processing)
                throw new BadRequestException("Chỉ có thể hoàn thành payout đang ở trạng thái Processing.");

            var success = await _unitOfWork.Payouts.MarkPayoutAsCompletedAsync(payoutId, adminId);

            if (!success)
            {
                _logger.LogError("MarkPayoutAsCompleted failed for payoutId={PayoutId} by adminId={AdminId}", payoutId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<PagedResult<AdminWithdrawRequestListItem>> GetAdminWithdrawRequestsAsync(int page, int pageSize, TransactionStatus? status)
        {
            var result = await _unitOfWork.WalletTransactions.GetAdminWithdrawRequestsAsync(page, pageSize, status);

            // Batch-fetch customer names from identity service
            var userIds = result.Items.Select(t => t.Wallet.UserId).Distinct().ToList();
            var nameMap = await _identityService.GetUserFullNameAsync(userIds);

            return new PagedResult<AdminWithdrawRequestListItem>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = result.Items.Select(t => new AdminWithdrawRequestListItem
                {
                    TransactionId = t.Id,
                    CustomerId = t.Wallet.UserId,
                    CustomerName = nameMap.TryGetValue(t.Wallet.UserId, out var name) ? name : "N/A",
                    Amount = t.Amount,
                    RequestedAt = t.CreatedAt,
                    Status = t.Status.ToString()
                }).ToList()
            };
        }

        public async Task<AdminWithdrawRequestDetail> GetAdminWithdrawRequestDetailAsync(int transactionId)
        {
            var transaction = await _unitOfWork.WalletTransactions.GetWithdrawRequestDetailAsync(transactionId);

            if (transaction == null)
                throw new NotFoundException("Không tìm thấy yêu cầu rút tiền.");

            var userId = transaction.Wallet.UserId;

            // Fetch customer full name
            var nameMap = await _identityService.GetUserFullNameAsync([userId]);
            var customerName = nameMap.TryGetValue(userId, out var name) ? name : "N/A";

            // Fetch most recent bank account linked to this user (BR-130)
            var bankAccount = await _unitOfWork.UserBankAccounts.GetSingleAsync(b => b.UserId == userId);

            return new AdminWithdrawRequestDetail
            {
                TransactionId = transaction.Id,
                CustomerId = userId,
                CustomerName = customerName,
                Amount = transaction.Amount,
                WalletBalance = transaction.Wallet.Balance,  // BR-131
                BankName = bankAccount?.BankName,
                AccountNumber = bankAccount?.AccountNumber,
                AccountHolderName = bankAccount?.AccountHolderName,
                Description = transaction.Description,
                RequestedAt = transaction.CreatedAt,
                Status = transaction.Status.ToString(),
                ProcessedBy = transaction.ProcessedBy,
                ProcessedAt = transaction.ProcessedAt,
                RejectionReason = transaction.RejectionReason
            };
        }

        public async Task<bool> StartProcessingWithdrawAsync(int transactionId, string adminId)
        {
            var transaction = await _unitOfWork.WalletTransactions.GetWithdrawRequestDetailAsync(transactionId);

            if (transaction == null)
                throw new NotFoundException("Không tìm thấy yêu cầu rút tiền.");

            if (transaction.Status != TransactionStatus.Pending)
                throw new BadRequestException("Chỉ có thể bắt đầu xử lý yêu cầu đang ở trạng thái Pending.");

            var success = await _unitOfWork.WalletTransactions.StartProcessingWithdrawAsync(transactionId, adminId);

            if (!success)
            {
                _logger.LogError("StartProcessingWithdraw failed for transactionId={TxId} by adminId={AdminId}", transactionId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<bool> CompleteWithdrawRequestAsync(int transactionId, string adminId)
        {
            var transaction = await _unitOfWork.WalletTransactions.GetWithdrawRequestDetailAsync(transactionId);

            if (transaction == null)
                throw new NotFoundException("Không tìm thấy yêu cầu rút tiền.");

            if (transaction.Status != TransactionStatus.Processing)
                throw new BadRequestException("Chỉ có thể hoàn thành yêu cầu đang ở trạng thái Processing.");

            var success = await _unitOfWork.WalletTransactions.CompleteWithdrawRequestAsync(transactionId, adminId);

            if (!success)
            {
                _logger.LogError("CompleteWithdrawRequest failed for transactionId={TxId} by adminId={AdminId}", transactionId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<bool> RejectWithdrawRequestAsync(int transactionId, string adminId, string rejectionReason)
        {
            if (string.IsNullOrWhiteSpace(rejectionReason))
                throw new BadRequestException("Lý do từ chối không được để trống.");

            var transaction = await _unitOfWork.WalletTransactions.GetWithdrawRequestDetailAsync(transactionId);

            if (transaction == null)
                throw new NotFoundException("Không tìm thấy yêu cầu rút tiền.");

            if (transaction.Status != TransactionStatus.Processing)
                throw new BadRequestException("Chỉ có thể từ chối yêu cầu đang ở trạng thái Processing.");

            var success = await _unitOfWork.WalletTransactions.RejectWithdrawRequestAsync(transactionId, adminId, rejectionReason);

            if (!success)
            {
                _logger.LogError("RejectWithdrawRequest failed for transactionId={TxId} by adminId={AdminId}", transactionId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<bool> StartProcessingPayoutAsync(int payoutId, string adminId)
        {
            var payout = await _unitOfWork.Payouts.GetByIdAsync(payoutId);

            if (payout == null)
                throw new NotFoundException("Không tìm thấy bản ghi thanh toán.");

            if (payout.Status != PayoutStatus.Pending)
                throw new BadRequestException("Chỉ có thể bắt đầu xử lý payout đang ở trạng thái Pending.");

            var success = await _unitOfWork.Payouts.StartProcessingPayoutAsync(payoutId, adminId);

            if (!success)
            {
                _logger.LogError("StartProcessingPayout failed for payoutId={PayoutId} by adminId={AdminId}", payoutId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<bool> MarkPayoutAsFailedAsync(int payoutId, string adminId, string failureReason)
        {
            if (string.IsNullOrWhiteSpace(failureReason))
                throw new BadRequestException("Lý do thất bại không được để trống.");

            var payout = await _unitOfWork.Payouts.GetByIdAsync(payoutId);

            if (payout == null)
                throw new NotFoundException("Không tìm thấy bản ghi thanh toán.");

            if (payout.Status != PayoutStatus.Processing)
                throw new BadRequestException("Chỉ có thể đánh dấu thất bại payout đang ở trạng thái Processing.");

            var success = await _unitOfWork.Payouts.MarkPayoutAsFailedAsync(payoutId, adminId, failureReason);

            if (!success)
            {
                _logger.LogError("MarkPayoutAsFailed failed for payoutId={PayoutId} by adminId={AdminId}", payoutId, adminId);
                throw new BadRequestException("Cập nhật trạng thái thất bại.");
            }

            return true;
        }

        public async Task<List<PayoutItemDto>> GetBookingPayouts(DateTime from, DateTime to)
        {
            var fromDate = DateOnly.FromDateTime(from);
            var toDate = DateOnly.FromDateTime(to);

            var bookings = await _unitOfWork.Bookings
                .FindAsync(b =>
                    b.BookingType == BookingType.Online &&
                    b.BookingDate >= fromDate &&
                    b.BookingDate < toDate);

            var result = new List<PayoutItemDto>();

            foreach (var b in bookings)
            {
                decimal amount = 0;

                if (b.Status == BookingStatus.Completed)
                {
                    amount = b.TotalPrice;
                }
                else if (b.Status == BookingStatus.CustomerCancelled)
                {
                    var cancel = (await _unitOfWork.CancelBooking
                        .FindAsync(x => x.BookingId == b.Id)).FirstOrDefault();

                    var refund = cancel?.RefundAmount ?? 0;
                    amount = b.TotalPrice - refund;
                }
                else continue;

                if (amount <= 0) continue;

                var existed = (await _unitOfWork.PayoutDetails
                    .FindAsync(x => x.BookingId == b.Id)).Any();

                if (existed) continue;

                var venue = await _unitOfWork.Venues.GetByIdAsync(b.VenueId);

                result.Add(new PayoutItemDto
                {
                    RefId = b.Id,
                    OwnerId = venue.OwnerId,
                    Amount = amount,
                    Type = PayoutDetailType.Booking
                });
            }

            return result;
        }

        public async Task<List<PayoutItemDto>> GetEventPayouts(DateTime from, DateTime to)
        {
            var fromDate = DateOnly.FromDateTime(from);
            var toDate = DateOnly.FromDateTime(to);

            var events = await _unitOfWork.TicketEvents
                .FindAsync(e =>
                    e.Status == TicketEventStatus.Completed &&
                    e.EventDate >= fromDate &&
                    e.EventDate < toDate);

            var result = new List<PayoutItemDto>();

            foreach (var e in events)
            {
                var total = (await _unitOfWork.TicketParticipants
                    .FindAsync(x =>
                        x.EventId == e.Id &&
                        x.Status == TicketParticipantStatus.Joined))
                    .Sum(x => x.TotalPrice);

                if (total <= 0) continue;

                var existed = (await _unitOfWork.PayoutDetails
                    .FindAsync(x => x.EventId == e.Id)).Any();

                if (existed) continue;

                var venue = await _unitOfWork.Venues.GetByIdAsync(e.VenueId);

                result.Add(new PayoutItemDto
                {
                    RefId = e.Id,
                    OwnerId = venue.OwnerId,
                    Amount = total,
                    Type = PayoutDetailType.Event
                });
            }

            return result;
        }
    }
}
