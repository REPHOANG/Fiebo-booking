using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/")]
    [ApiController]
    public class SportTypesController : ControllerBase
    {
        private readonly IFieldService _fieldService;

        public SportTypesController(IFieldService fieldService)
        {
            _fieldService = fieldService;
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
    }
}
