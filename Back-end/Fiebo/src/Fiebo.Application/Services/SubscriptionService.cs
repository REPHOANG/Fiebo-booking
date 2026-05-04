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
                await _unitOfWork.ExecuteStrategyAsync(async () =>
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
                        var currentOwnerPlan = await _unitOfWork.OwnerPlans.GetByOwnerIdAsync(ownerId);

                        DateTime startDate;
                        DateTime endDate;

                        if (currentOwnerPlan != null && (currentOwnerPlan.Status == OwnerPlanStatus.Active || currentOwnerPlan.Status == OwnerPlanStatus.Expired) && currentOwnerPlan.EndDate > DateTime.Now)
                        {
                            // Active Renewal: Extend from existing EndDate
                            startDate = currentOwnerPlan.StartDate; // Keep original start date for continuity
                            endDate = currentOwnerPlan.EndDate.AddDays(plan.DurationDays);
                            currentOwnerPlan.Status = OwnerPlanStatus.Active;
                            currentOwnerPlan.EndDate = endDate;
                            currentOwnerPlan.PlanId = plan.Id; // Update to latest plan type
                            _unitOfWork.OwnerPlans.Update(currentOwnerPlan);
                        }
                        else
                        {
                            // New or Expired: Start today
                            startDate = DateTime.Now;
                            endDate = startDate.AddDays(plan.DurationDays);

                            if (currentOwnerPlan == null)
                            {
                                currentOwnerPlan = new OwnerPlan
                                {
                                    OwnerId = ownerId,
                                    PlanId = plan.Id,
                                    StartDate = startDate,
                                    EndDate = endDate,
                                    Status = OwnerPlanStatus.Active
                                };
                                _unitOfWork.OwnerPlans.Add(currentOwnerPlan);
                            }
                            else
                            {
                                currentOwnerPlan.PlanId = plan.Id;
                                currentOwnerPlan.StartDate = startDate;
                                currentOwnerPlan.EndDate = endDate;
                                currentOwnerPlan.Status = OwnerPlanStatus.Active;
                                _unitOfWork.OwnerPlans.Update(currentOwnerPlan);
                            }
                        }

                        // 6. Record SubscriptionTransaction (History)
                        // We need OwnerPlanId, so we save changes if currentOwnerPlan is new
                        await _unitOfWork.SaveChangesAsync();

                        var subTransaction = new SubscriptionTransaction
                        {
                            OwnerPlanId = currentOwnerPlan.Id,
                            PlanId = plan.Id,
                            Amount = plan.Price,
                            PaidAt = DateTime.Now
                        };
                        _unitOfWork.SubscriptionTransactions.Add(subTransaction);
                        await _unitOfWork.SaveChangesAsync();

                        // 7. Record WalletTransaction
                        var walletTransaction = new WalletTransaction
                        {
                            WalletId = trackedWallet.Id,
                            TransactionType = TransactionType.Subscription,
                            Direction = TransactionDirection.Debit,
                            Amount = plan.Price,
                            CreatedAt = DateTime.Now,
                            ReferenceId = subTransaction.Id // Points to SubscriptionTransaction
                        };

                        _unitOfWork.WalletTransactions.Add(walletTransaction);

                        await _unitOfWork.SaveChangesAsync();
                        await _unitOfWork.CommitTransactionAsync();

                        _logger.LogInformation("Subscription processed. Owner: {OwnerId}, Plan: {PlanId}, TransId: {TransId}", ownerId, plan.Id, subTransaction.Id);

                    }
                    catch
                    {
                        await _unitOfWork.RollbackTransactionAsync();
                        throw;
                    }
                });

                // Re-fetch updated plan for response
                var finalOwnerPlan = await _unitOfWork.OwnerPlans.GetByOwnerIdAsync(ownerId);
                var finalWallet = await _unitOfWork.Wallets.GetByUserId(ownerId);

                return new OwnerPlanResponse
                {
                    OwnerPlanId = finalOwnerPlan!.Id,
                    PlanName = plan.Name,
                    StartDate = finalOwnerPlan.StartDate,
                    EndDate = finalOwnerPlan.EndDate,
                    RemainingBalance = finalWallet!.Balance
                };
            }
            finally
            {
                await _cacheService.ReleaseLockAsync(lockKey, lockValue);
            }
        }

        public async Task<CurrentOwnerPlanResponse?> GetCurrentPlanAsync(string ownerId)
        {
            var currentPlan = await _unitOfWork.OwnerPlans.GetCurrentActiveByOwnerIdAsync(ownerId);
            if (currentPlan == null)
            {
                return null;
            }

            return new CurrentOwnerPlanResponse
            {
                PlanId = currentPlan.PlanId,
                PlanName = currentPlan.Plan.Name,
                EndDate = currentPlan.EndDate,
                RemainingDays = CalculateRemainingDays(currentPlan.EndDate),
                Status = currentPlan.Status.ToString(),
                CreatedAt = currentPlan.CreatedAt
            };
        }

        public async Task<List<PlanPurchaseHistoryResponse>> GetPlanPurchaseHistoryAsync(string ownerId)
        {
            var transactions = await _unitOfWork.SubscriptionTransactions.GetByOwnerIdAsync(ownerId);

            return transactions.Select(transaction => new PlanPurchaseHistoryResponse
            {
                PlanId = transaction.PlanId,
                PlanName = transaction.Plan.Name,
                Price = transaction.Amount,
                CreatedAt = transaction.CreatedAt
            }).ToList();
        }

        // ─── Admin ────────────────────────────────────────────────────────────

        /// <summary>
        /// UC-Admin: Tạo gói đăng ký mới.
        /// </summary>
        public async Task<SubscriptionPlanResponse> CreatePlanAsync(CreateSubscriptionPlanRequest request)
        {
            // 1. Validate tên không trùng
            var isNameExists = await _unitOfWork.SubscriptionPlans.IsNameExistsAsync(request.Name);
            if (isNameExists)
            {
                throw new ResourceConflictException($"Tên gói '{request.Name}' đã tồn tại trong hệ thống.");
            }

            // 2. Tạo entity mới
            var plan = new SubscriptionPlan
            {
                Name = request.Name,
                DurationDays = request.DurationDays,
                Price = request.Price
            };

            _unitOfWork.SubscriptionPlans.Add(plan);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Admin tạo gói mới: {PlanName} - {Price} VND - {Days} ngày", plan.Name, plan.Price, plan.DurationDays);

            return new SubscriptionPlanResponse
            {
                Id = plan.Id,
                Name = plan.Name,
                DurationDays = plan.DurationDays,
                Price = plan.Price
            };
        }

        /// <summary>
        /// UC-Admin: Chỉnh sửa gói đăng ký.
        /// - Nếu gói CHƯA có ai đăng ký → edit trực tiếp.
        /// - Nếu gói ĐÃ có người đăng ký → soft-delete gói cũ + tạo gói mới.
        /// </summary>
        public async Task<SubscriptionPlanResponse> UpdatePlanAsync(int id, UpdateSubscriptionPlanRequest request)
        {
            // 1. Tìm gói
            var plan = await _unitOfWork.SubscriptionPlans.GetByIdAsync(id);
            if (plan == null)
            {
                throw new NotFoundException("Không tìm thấy gói đăng ký.");
            }

            // 2. Kiểm tra tên trùng (loại trừ chính gói đang sửa)
            var isNameExists = await _unitOfWork.SubscriptionPlans.IsNameExistsAsync(request.Name, excludeId: id);
            if (isNameExists)
            {
                throw new ResourceConflictException($"Tên gói '{request.Name}' đã tồn tại trong hệ thống.");
            }

            // 3. Kiểm tra gói đã có subscriber chưa
            var hasSubscribers = await _unitOfWork.SubscriptionPlans.HasSubscribersAsync(id);

            SubscriptionPlan resultPlan;

            if (!hasSubscribers)
            {
                // Chưa có subscriber → Edit trực tiếp
                plan.Name = request.Name;
                plan.DurationDays = request.DurationDays;
                plan.Price = request.Price;
                plan.UpdatedAt = DateTime.Now;

                _unitOfWork.SubscriptionPlans.Update(plan);
                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation("Admin edit trực tiếp gói #{PlanId}: {PlanName}", plan.Id, plan.Name);
                resultPlan = plan;
            }
            else
            {
                // Đã có subscriber → Soft-delete gói cũ + tạo gói mới
                plan.IsDeleted = true;
                plan.UpdatedAt = DateTime.Now;
                _unitOfWork.SubscriptionPlans.Update(plan);

                var newPlan = new SubscriptionPlan
                {
                    Name = request.Name,
                    DurationDays = request.DurationDays,
                    Price = request.Price
                };
                _unitOfWork.SubscriptionPlans.Add(newPlan);

                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation(
                    "Admin update gói #{OldPlanId} (đã có subscriber) → soft-delete + tạo gói mới #{NewPlanId}: {PlanName}",
                    plan.Id, newPlan.Id, newPlan.Name);

                resultPlan = newPlan;
            }

            return new SubscriptionPlanResponse
            {
                Id = resultPlan.Id,
                Name = resultPlan.Name,
                DurationDays = resultPlan.DurationDays,
                Price = resultPlan.Price
            };
        }

        /// <summary>
        /// UC-Admin: Xóa mềm gói đăng ký.
        /// Gói sẽ không hiển thị cho owner nhưng vẫn được giữ lại vì lý do lịch sử.
        /// </summary>
        public async Task DeletePlanAsync(int id)
        {
            var plan = await _unitOfWork.SubscriptionPlans.GetByIdAsync(id);
            if (plan == null)
            {
                throw new NotFoundException("Không tìm thấy gói đăng ký.");
            }

            plan.IsDeleted = true;
            plan.UpdatedAt = DateTime.Now;

            _unitOfWork.SubscriptionPlans.Update(plan);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Admin xóa mềm gói #{PlanId}: {PlanName}", plan.Id, plan.Name);
        }

        private static int CalculateRemainingDays(DateTime endDate)
        {
            var remaining = endDate.Date - DateTime.Now.Date;
            return (int)Math.Max(0, Math.Ceiling(remaining.TotalDays));
        }
    }
}
