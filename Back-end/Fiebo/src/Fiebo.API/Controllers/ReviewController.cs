using Fiebo.API.Wrappers;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Fiebo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        private readonly ICloudinaryService _cloudinaryService;


        public ReviewController(IReviewService reviewService, ICloudinaryService cloudinaryService)
        {
            _reviewService = reviewService;
            _cloudinaryService = cloudinaryService;
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost]
        public async Task<IActionResult> CreateReview([FromForm] CreateReviewRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var result = await _reviewService.CreateReviewAsync(request, userId!);

            return Ok(new ApiResponse<object>
            {
                StatusCode = StatusCodes.Status200OK,
                Message = "Tạo đánh giá thành công."
            });
        }

        [HttpPost("upload-test")]
        [Consumes("multipart/form-data")] // Ép kiểu nhận File chứ không phải JSON
        public async Task<IActionResult> TestUploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Vui lòng đính kèm một file ảnh."
                });
            }
            try
            {
                // Gọi Service Upload
                var imageUrl = await _cloudinaryService.UploadImageAsync(file);
                return Ok(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Upload ảnh thành công!",
                    Data = new
                    {
                        ImageUrl = imageUrl // Trả URL trực tiếp ra ngoài để copy test
                    }
                });
            }
            catch (System.Exception ex)
            {
                // Lỗi thường do sai Cấu hình (Key, Secret) hoặc mất mạng
                return BadRequest(new ApiResponse<object>
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = $"Lỗi Cloudinary: {ex.Message}"
                });
            }
        }
    }
}
