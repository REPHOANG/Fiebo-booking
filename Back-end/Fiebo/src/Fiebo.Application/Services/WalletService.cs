using Fiebo.Application.DTOs.Wallet;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;

namespace Fiebo.Application.Services
{
    public class WalletService : IWalletService
    {
        private readonly IUnitOfWork _unitOfWork;
        private IQrPaymentService _qrPaymentService;
        public WalletService(IUnitOfWork unitOfWork, IQrPaymentService qrPaymentService)
        {
            _unitOfWork = unitOfWork;
            _qrPaymentService = qrPaymentService;
        }

        public async Task<QrPaymentResponseDto> GenerateTopUpQrAsync(decimal amount, string userId)
        {
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if(wallet == null)
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
    }
}
