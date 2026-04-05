using Fiebo.Application.DTOs.Payout;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
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

        public Task<bool> ProcessPayoutAsync(int transactionId, decimal amount, string bankName, string accountNumber, string accountHolderName)
        {
            throw new NotImplementedException();
        }
    }
}

