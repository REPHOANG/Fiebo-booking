using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
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
                throw new NotFoundException("Booking không tồn tại hoặc không thuộc quyền của bạn.");

            // Chỉ cho phép đánh giá nếu đã hoàn thành 
            if (booking.Status != BookingStatus.Completed)
                throw new BadRequestException("Chỉ được đánh giá sau khi đã hoàn thành sử dụng sân.");

            // Kiểm tra xem đã review chưa
            var isReviewed = await _unitOfWork.Reviews.HasReviewForBookingAsync(request.BookingId);
            if (isReviewed)
                throw new BadRequestException("Bạn đã đánh giá trải nghiệm đặt sân này rồi.");

            // 2. Map dữ liệu thành Entity Review
            var review = new Review
            {
                BookingId = request.BookingId,
                UserId = userId,
                Rating = request.Rating,
                Comment = request.Comment
            };

            // 3. Xử lý Upload Ảnh và Khởi tạo Data ReviewImage
            var reviewImages = new List<ReviewImage>();

            if (request.Images != null && request.Images.Count > 0)
            {
                if (request.Images.Count > 5)
                    throw new BadRequestException("Tối đa được đính kèm 5 hình ảnh.");

                foreach (var file in request.Images)
                {
                    try
                    {
                        var imageUrl = await _cloudinaryService.UploadImageAsync(file);

                        reviewImages.Add(new ReviewImage
                        {
                            ImageUrl = imageUrl,
                            Review = review
                        });
                    }
                    catch (System.Exception ex)
                    {
                        _logger.LogError($"Lỗi upload ảnh: {ex.Message}");
                        throw new BadRequestException("Lỗi xử lý ảnh, vui lòng thử lại sau.");
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
