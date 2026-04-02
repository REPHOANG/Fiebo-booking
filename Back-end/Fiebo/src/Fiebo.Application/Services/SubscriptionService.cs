using Fiebo.Application.DTOs.Subscription;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICacheService _cacheService;
        private readonly ILogger<SubscriptionService> _logger;
        private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(5);

        public SubscriptionService(IUnitOfWork unitOfWork, ICacheService cacheService, ILogger<SubscriptionService> logger)
        {
            _unitOfWork = unitOfWork;
            _cacheService = cacheService;
            _logger = logger;
        }

        public async Task<List<SubscriptionPlanResponse>> GetAvailablePlansAsync()
        {
            var plans = await _unitOfWork.SubscriptionPlans.GetAllPlansAsync();
            return plans.Select(p => new SubscriptionPlanResponse
            {
                Id = p.Id,
                Name = p.Name,
                DurationDays = p.DurationDays,
                Price = p.Price
            }).ToList();
        }

        public async Task<OwnerPlanResponse> SubscribeToPlanAsync(int planId, string ownerId)
        {
            // 1. Fetch Plan
            var plan = await _unitOfWork.SubscriptionPlans.GetByIdAsync(planId);
            if (plan == null)
            {
                throw new NotFoundException("Không tìm thấy gói đăng ký.");
            }

            // 2. Pre-flight Balance Check (fast fail)
            var wallet = await _unitOfWork.Wallets.GetByUserId(ownerId);
            if (wallet == null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
            }
            if (wallet.Balance < plan.Price)
            {
                throw new BadRequestException("Số dư ví không đủ để đăng ký gói.");
            }

            // 3. Acquire Distributed Lock to prevent duplicate fast clicks
            var lockKey = $"plan:subscribe:{ownerId}";
            var lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);
            
            if (lockValue == null)
            {
                _logger.LogWarning("Duplicate plan subscribe request for owner {ownerId}", ownerId);
                throw new ResourceConflictException("Yêu cầu đang được xử lý, vui lòng chờ.");
            }

            try
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    // 4. Re-fetch wallet for atomic update
                    var trackedWallet = await _unitOfWork.Wallets.GetByUserId(ownerId);
                    if (trackedWallet == null || trackedWallet.Balance < plan.Price)
                    {
                        throw new BadRequestException("Số dư ví không đủ để đăng ký gói.");
                    }

                    // Deduct balance
                    trackedWallet.Balance -= plan.Price;
                    _unitOfWork.Wallets.Update(trackedWallet);

                    // 5. Handle BR-02 / BR-03 Duration Logic
                    var latestActivePlan = await _unitOfWork.OwnerPlans.GetLatestActiveAsync(ownerId, plan.Id);

                    DateTime startDate;
                    DateTime endDate;

                    if (latestActivePlan != null)
                    {
                        // Active Renewal: Extend from existing EndDate
                        startDate = DateTime.Now;
                        endDate = latestActivePlan.EndDate.AddDays(plan.DurationDays);
                    }
                    else
                    {
                        // New or Expired: Start today
                        startDate = DateTime.Now;
                        endDate = startDate.AddDays(plan.DurationDays);
                    }

                    // Create entirely new row (BR-03: No Composite PK)
                    var newOwnerPlan = new OwnerPlan
                    {
                        OwnerId = ownerId,
                        PlanId = plan.Id,
                        StartDate = startDate,
                        EndDate = endDate,
                        PaidAt = DateTime.Now,
                        Price = plan.Price,
                        Status = OwnerPlanStatus.Active
                    };

                    _unitOfWork.OwnerPlans.Add(newOwnerPlan);

                    // 6. Record WalletTransaction
                    var transaction = new WalletTransaction
                    {
                        WalletId = trackedWallet.Id,
                        TransactionType = TransactionType.Subscription,
                        Direction = TransactionDirection.Debit,
                        Amount = plan.Price,
                        CreatedAt = DateTime.Now
                        // ReferenceId will be populated after save, but EF Core can handle it if we associate objects. 
                        // However we don't have direct navigation property here so we just save first if we really need ReferenceId.
                    };

                    _unitOfWork.WalletTransactions.Add(transaction);

                    await _unitOfWork.SaveChangesAsync();
                    
                    // Update reference id
                    transaction.ReferenceId = newOwnerPlan.Id;
                    await _unitOfWork.SaveChangesAsync();

                    await _unitOfWork.CommitTransactionAsync();

                    _logger.LogInformation("Subscription created. Owner: {OwnerId}, Plan: {PlanId}", ownerId, plan.Id);

                    return new OwnerPlanResponse
                    {
                        OwnerPlanId = newOwnerPlan.Id,
                        PlanName = plan.Name,
                        StartDate = newOwnerPlan.StartDate,
                        EndDate = newOwnerPlan.EndDate,
                        AmountPaid = newOwnerPlan.Price,
                        RemainingBalance = trackedWallet.Balance
                    };
                }
                catch
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    throw;
                }
            }
            finally
            {
                await _cacheService.ReleaseLockAsync(lockKey, lockValue);
            }
        }
    }
}
