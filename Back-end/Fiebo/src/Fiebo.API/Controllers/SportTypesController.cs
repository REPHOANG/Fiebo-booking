using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/")]
    [ApiController]
    public class SportTypesController : ControllerBase
    {
        private readonly IFieldService _fieldService;
        private readonly ISportTypeService _sportTypeService;

        public SportTypesController(IFieldService fieldService, ISportTypeService sportTypeService)
        {
            _fieldService = fieldService;
            _sportTypeService = sportTypeService;
        }

        [HttpGet("sport-types")]
        public async Task<IActionResult> GetSportTypes()
        {
            return Ok(new ApiResponse<List<SportTypeResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy danh sách môn thể thao thành công",
                Data = await _fieldService.GetAllSportTypes()
            });
        }

        /// <summary>
        /// UC-68: Administrator tạo danh mục môn thể thao mới.
        /// </summary>
        [Authorize(Roles = AppRoles.Admin)]
        [HttpPost("sport-types")]
        public async Task<IActionResult> CreateSportType(
            [FromBody] CreateSportTypeRequest request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Tên môn thể thao không được để trống."
                });
            }

            var sportId = await _sportTypeService.CreateSportTypeAsync(request, cancellationToken);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo môn thể thao mới thành công.",
                Data = new { Id = sportId }
            });
        }

        /// <summary>
        /// Xem chi tiết một môn thể thao
        /// </summary>
        [HttpGet("sport-types/{id}")]
        public async Task<IActionResult> GetSportTypeById(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var result = await _sportTypeService.GetSportTypeByIdAsync(id, cancellationToken);

            return Ok(new ApiResponse<SportTypeResponse>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Lấy thông tin môn thể thao thành công.",
                Data = result
            });
        }

        /// <summary>
        /// Administrator cập nhật môn thể thao
        /// </summary>
        [Authorize(Roles = AppRoles.Admin)]
        [HttpPut("sport-types/{id}")]
        public async Task<IActionResult> UpdateSportType(
            [FromRoute] int id,
            [FromBody] UpdateSportTypeRequest request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Tên môn thể thao không được để trống."
                });
            }

            await _sportTypeService.UpdateSportTypeAsync(id, request, cancellationToken);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật môn thể thao thành công."
            });
        }
    }
}
