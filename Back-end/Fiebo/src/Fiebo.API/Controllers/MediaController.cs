using Fiebo.API.Wrappers;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MediaController : ControllerBase
    {
        private readonly IFieldService _fieldService;

        public MediaController(IFieldService fieldService)
        {
            _fieldService = fieldService;
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("field/{id}/upload")]
        public async Task<IActionResult> UploadFieldImage([FromRoute] int id, [FromForm] List<IFormFile> files)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _fieldService.UploadFieldImage(id, userId, files);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tải ảnh lên thành công"
            });
        }

        [Authorize(Policy = "ActiveOwnerPlan")]
        [HttpPost("field/delete/{*publicId}")]
        public async Task<IActionResult> DeleteFieldImage([FromRoute] string publicId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
            await _fieldService.DeleteFieldImage(publicId, userId);
            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa ảnh thành công"
            });

        }
    }
}
