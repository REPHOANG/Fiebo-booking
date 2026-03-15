using Fiebo.Application.DTOs.Review;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Fiebo.Application.Tests.Reviews
{
    public class CreateReviewTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IBookingRepository> _bookingRepo = new();
        private readonly Mock<IReviewRepository> _reviewRepo = new();
        private readonly Mock<ICloudinaryService> _cloudinaryService = new();
        private readonly Mock<ILogger<ReviewService>> _logger = new();

        private readonly ReviewService _service;

        public CreateReviewTests()
        {
            _unitOfWork.Setup(x => x.Bookings).Returns(_bookingRepo.Object);
            _unitOfWork.Setup(x => x.Reviews).Returns(_reviewRepo.Object);

            _service = new ReviewService(
                _unitOfWork.Object,
                _cloudinaryService.Object,
                _logger.Object
            );
        }

        [Fact]
        public async Task Should_ThrowNotFound_WhenBookingNotFound()
        {
            var request = new CreateReviewRequest
            {
                BookingId = 1,
                Rating = 5
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync((Booking)null!);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.CreateReviewAsync(request, "user1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenBookingNotCompleted()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Booked,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            var request = new CreateReviewRequest
            {
                BookingId = 1,
                Rating = 5
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateReviewAsync(request, "user1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenAlreadyReviewed()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Completed,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            _reviewRepo.Setup(x => x.HasReviewForBookingAsync(1))
                .ReturnsAsync(true);

            var request = new CreateReviewRequest
            {
                BookingId = 1,
                Rating = 5
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateReviewAsync(request, "user1"));
        }

        [Fact]
        public async Task Should_ThrowBadRequest_WhenMoreThan5Images()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Completed,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            _reviewRepo.Setup(x => x.HasReviewForBookingAsync(1))
                .ReturnsAsync(false);

            var images = new List<IFormFile>();

            for (int i = 0; i < 6; i++)
            {
                images.Add(Mock.Of<IFormFile>());
            }

            var request = new CreateReviewRequest
            {
                BookingId = 1,
                Rating = 5,
                Images = images
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.CreateReviewAsync(request, "user1"));
        }

        [Fact]
        public async Task Should_CreateReview_WhenValid()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Status = BookingStatus.Completed,
                Fullname = "John Doe",
                PhoneNumber = "1234567890",
            };

            _bookingRepo.Setup(x => x.GetByIdAsync(1))
                .ReturnsAsync(booking);

            _reviewRepo.Setup(x => x.HasReviewForBookingAsync(1))
                .ReturnsAsync(false);

            _unitOfWork.Setup(x => x.SaveChangesAsync())
                .ReturnsAsync(1);

            var request = new CreateReviewRequest
            {
                BookingId = 1,
                Rating = 5,
                Comment = "Great field"
            };

            var result = await _service.CreateReviewAsync(request, "user1");

            Assert.True(result);

            _reviewRepo.Verify(x => x.Add(It.IsAny<Review>()), Times.Once);
            _unitOfWork.Verify(x => x.SaveChangesAsync(), Times.Once);
        }
    }
}