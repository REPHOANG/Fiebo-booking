using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Exceptions;

namespace Fiebo.Application.Services
{
    public class FinanceAdminService : IFinanceAdminService
    {
        private readonly IIdentityService _identityService;

        public FinanceAdminService(IIdentityService identityService)
        {
            _identityService = identityService;
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
    }
}