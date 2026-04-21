using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
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
            if(!string.IsNullOrEmpty(filter.Status))
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
    }
}