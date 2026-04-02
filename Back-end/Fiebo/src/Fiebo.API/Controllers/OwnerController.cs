using System.Security.Claims;
using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Owner;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Authorize(Roles = AppRoles.FieldOwner)]
    [Route("api/[controller]")]
    [ApiController]
    public class OwnerController : ControllerBase
    {
        private readonly IStaffService _staffService;

        public OwnerController(IStaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpGet("staff")]
        public async Task<IActionResult> GetMyStaff()
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _staffService.GetOwnerStaffListAsync(ownerId!);
            return Ok(new ApiResponse<List<OwnerStaffListResponse>>
            {
                StatusCode = 200,
                Data = result
            });
        }

        [HttpPost("staff")]
        public async Task<IActionResult> CreateStaff([FromBody] OwnerCreateStaffRequest request)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var success = await _staffService.CreateStaffAsync(ownerId!, request);

            if (success)
                return Ok(new ApiResponse<string>
                {
                    StatusCode = 200,
                    Message = "Thêm nhân viên thành công."
                });

            return BadRequest(new { StatusCode = 400, Message = "Không thể thêm nhân viên." });
        }

        [HttpPatch("staff/{staffId}")]
        public async Task<IActionResult> DeactivateStaff(string staffId)
        {
            var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _staffService.ChangeStaffStatusAsync(ownerId!, staffId);

            if (result)
                return Ok(new ApiResponse<string> { StatusCode = 200, Message = "Staff deactivated successfully." });

            return BadRequest(new ApiResponse<string> { StatusCode = 400, Message = "Failed to deactivate staff." });
        }
    }
}