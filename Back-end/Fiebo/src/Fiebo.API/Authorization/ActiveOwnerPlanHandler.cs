using Fiebo.Domain.Enums;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Fiebo.API.Authorization
{
    public class ActiveOwnerPlanHandler : AuthorizationHandler<ActiveOwnerPlanRequirement>
    {
        private readonly IOwnerPlanRepository _ownerPlanRepository;
        private readonly IVenueStaffRepository _venueStaffRepository;

        public ActiveOwnerPlanHandler(
            IOwnerPlanRepository ownerPlanRepository,
            IVenueStaffRepository venueStaffRepository)
        {
            _ownerPlanRepository = ownerPlanRepository;
            _venueStaffRepository = venueStaffRepository;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            ActiveOwnerPlanRequirement requirement)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? context.User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
            {
                context.Fail(new AuthorizationFailureReason(this, "Không thể xác định danh tính chủ sân."));
                return;
            }

            string ownerId;

            if (context.User.IsInRole(AppRoles.FieldOwner))
            {
                ownerId = userId;
            }
            else if (requirement.AllowStaff && context.User.IsInRole(AppRoles.FieldStaff))
            {
                var ownerIds = await _venueStaffRepository
                    .GetQueryable()
                    .AsNoTracking()
                    .Where(vs => vs.StaffId == userId)
                    .Include(vs => vs.Venue)
                    .Select(vs => vs.Venue.OwnerId)
                    .Distinct()
                    .ToListAsync();

                if (ownerIds.Count == 0)
                {
                    context.Fail(new AuthorizationFailureReason(
                        this,
                        "Tài khoản nhân viên chưa được gán vào sân nào."));
                    return;
                }

                if (ownerIds.Count > 1)
                {
                    context.Fail(new AuthorizationFailureReason(
                        this,
                        "Tài khoản nhân viên đang được gán cho nhiều chủ sân khác nhau, không thể xác thực gói thuê bao."));
                    return;
                }

                ownerId = ownerIds[0];
            }
            else
            {
                context.Fail(new AuthorizationFailureReason(
                    this,
                    requirement.AllowStaff
                        ? "Vai trò tài khoản không hợp lệ để truy cập tài nguyên này."
                        : "Chỉ chủ sân mới được phép truy cập tài nguyên này."));
                return;
            }

            var ownerPlan = await _ownerPlanRepository.GetCurrentActiveByOwnerIdAsync(ownerId);
            var isActive = ownerPlan != null
                && ownerPlan.Status == OwnerPlanStatus.Active
                && ownerPlan.EndDate >= DateTime.Now;

            if (!isActive)
            {
                context.Fail(new AuthorizationFailureReason(
                    this,
                    "Gói thuê bao của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng tính năng chủ sân."));
                return;
            }

            context.Succeed(requirement);
        }
    }
}
