using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Address;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AddressController : ControllerBase
    {
        private readonly IAddressService _addressService;
        public AddressController(IAddressService addressService)
        {
            _addressService = addressService;
        }
        [HttpGet("provinces")]
        public async Task<IActionResult> GetProvinces()
        {
            return Ok(new ApiResponse<List<AddressListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Provinces retrieved successfully",
                Data = await _addressService.GetProvinceListsAsync()
            });
        }

        [HttpGet("districts/{provinceId}")]
        public async Task<IActionResult> GetDistrictsByProvince(int provinceId)
        {
            return Ok(new ApiResponse<List<AddressListResponse>>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Districts retrieved successfully",
                Data = await _addressService.GetWardByProvinceAsync(provinceId)
            });
        }
    }
}
