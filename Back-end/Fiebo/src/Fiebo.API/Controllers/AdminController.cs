using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Admin)] 
    public class AdminController : ControllerBase
    {
        private readonly IFinanceAdminService _financeAdminService;

        public AdminController(IFinanceAdminService financeAdminService)
        {
            _financeAdminService = financeAdminService;
        }

        /// <summary>
        /// Lấy danh sách tài khoản Finance Admin
        /// </summary>
        [HttpGet("finance-admins")]
        public async Task<IActionResult> GetFinanceAdmins()
        {
            var result = await _financeAdminService.GetFinanceAdminListAsync();
            return Ok(new ApiResponse<List<FinanceAdminListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách Finance Admin thành công.",
                Data = result
            });
        }

        /// <summary>
        /// UC-66: Tạo tài khoản Finance Admin mới
        /// </summary>
        [HttpPost("finance-admins")]
        public async Task<IActionResult> CreateFinanceAdmin([FromBody] CreateFinanceAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Username và Password không được để trống."
                });
            }

            await _financeAdminService.CreateFinanceAdminAsync(request);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Thêm nhân viên thành công."
            });
        }
    }
}