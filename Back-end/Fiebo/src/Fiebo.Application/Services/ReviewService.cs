using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ILogger<ReviewService> _logger;

        public ReviewService(
            IUnitOfWork unitOfWork,
            ICloudinaryService cloudinaryService,
            ILogger<ReviewService> logger)
        {
            _unitOfWork = unitOfWork;
            _cloudinaryService = cloudinaryService;
            _logger = logger;
        }

        public async Task<bool> CreateReviewAsync(CreateReviewRequest request, string userId)
        {
            // 1. Kiểm tra Booking tồn tại và thuộc quyền của người gọi API
            var booking = await _unitOfWork.Bookings.GetByIdAsync(request.BookingId);

            if (booking == null || booking.UserId != userId)
                throw new NotFoundException("Không tìm thấy lịch đặt");

            // Chỉ cho phép đánh giá nếu đã hoàn thành 
            if (booking.Status != BookingStatus.Completed)
                throw new BadRequestException("Chưa đến thời gian đánh giá.");

            // Kiểm tra xem đã review chưa
            var isReviewed = await _unitOfWork.Reviews.HasReviewForBookingAsync(request.BookingId);
            if (isReviewed)
                throw new BadRequestException("Không thể đánh giá đơn đã đánh giá.");
            if (!double.TryParse(request.Rating, NumberStyles.Any, CultureInfo.InvariantCulture, out var rating))
            {
                throw new BadRequestException("Rating không hợp lệ.");
            }

            if (rating < 0 || rating > 5)
            {
                throw new BadRequestException("Rating phải từ 0 đến 5.");
            }
            // 2. Map dữ liệu thành Entity Review
            var review = new Review
            {
                BookingId = request.BookingId,
                UserId = userId,
                Rating = rating,
                Comment = request.Comment
            };

            // 3. Xử lý Upload Ảnh và Khởi tạo Data ReviewImage
            var reviewImages = new List<ReviewImage>();

            if (request.Images != null && request.Images.Count > 0)
            {
                if (request.Images.Count > 5)
                    throw new BadRequestException("Tối đa được đính kèm 5 hình ảnh.");
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".svg" };
                var allowedContentTypes = new[]
                {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/svg+xml"
        };

                foreach (var file in request.Images)
                {
                    if (file.Length == 0)
                        throw new BadRequestException("Ảnh không hợp lệ.");

                    if (file.Length > 5 * 1024 * 1024) //5mb
                        throw new BadRequestException("Mỗi ảnh không được vượt quá 5MB.");

                    var extension = Path.GetExtension(file.FileName).ToLower();

                    if (!allowedExtensions.Contains(extension))
                        throw new BadRequestException("Chỉ chấp nhận ảnh jpg, jpeg, png, webp, svg.");

                    if (!allowedContentTypes.Contains(file.ContentType))
                        throw new BadRequestException("Định dạng ảnh không hợp lệ.");
                    try
                    {
                        var imageUrl = (await _cloudinaryService.UploadImageAsync(file)).Url;

                        reviewImages.Add(new ReviewImage
                        {
                            ImageUrl = imageUrl,
                            Review = review
                        });
                    }
                    catch (System.Exception ex)
                    {
                        _logger.LogError($"Lỗi upload ảnh: {ex.Message}");
                        throw new BadRequestException("Tải ảnh lên thất bại vui lòng thử lại.");
                    }
                }
            }

            review.Images = reviewImages;

            // 4. Lưu CSDL
            _unitOfWork.Reviews.Add(review);
            var result = await _unitOfWork.SaveChangesAsync();

            return result > 0;
        }
    }
}
