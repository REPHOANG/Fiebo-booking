using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Domain.Exceptions;
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
        public PayoutService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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
                    FailureReason = payout.FailureReason
                },
                FinancialSummary = new PayoutFinancialSummaryDto
                {
                    TotalAmount = payout.Amount,
                    BankName = bankAccount?.BankName ?? "N/A",
                    MaskedAccountNumber = originalAccount,
                    AccountHolderName = bankAccount?.AccountHolderName ?? "N/A"
                },
                FacilitiesBreakdown = payout.PayoutDetails
                    .GroupBy(pd => new { pd.Booking.VenueId, VenueName = pd.Booking.Venue.Name })
                    .Select(g => new VenuePayoutBreakdownDto
                    {
                        VenueId = g.Key.VenueId,
                        VenueName = g.Key.VenueName,
                        Subtotal = g.Sum(pd => pd.Amount),
                        Bookings = g.Select(pd => new PayoutBookingDetailDto
                        {
                            BookingId = pd.BookingId,
                            PlayDate = pd.Booking.BookingDate,
                            SubFieldName = string.Join(", ", pd.Booking.BookingDetails.Select(bd => bd.Field.Name).Distinct()),
                            Amount = pd.Amount
                        }).ToList()
                    })
                    .ToList()
            };
 
            return response;
        }
 
        public Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName)
        {
            throw new NotImplementedException();
        }
    }
}

