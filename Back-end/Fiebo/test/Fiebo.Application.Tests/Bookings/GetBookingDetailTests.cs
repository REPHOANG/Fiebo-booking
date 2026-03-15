using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.Bookings
{
    public class GetBookingDetailTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
        private readonly Mock<IBookingRepository> _bookingRepoMock = new();

        private readonly Mock<IOtpService> _otpServiceMock = new();
        private readonly Mock<ISmsService> _smsServiceMock = new();
        private readonly Mock<IIdentityService> _identityServiceMock = new();
        private readonly Mock<ITokenService> _tokenServiceMock = new();
        private readonly Mock<ICacheService> _cacheServiceMock = new();
        private readonly Mock<ILogger<BookingService>> _loggerMock = new();

        private readonly BookingService _service;

        public GetBookingDetailTests()
        {
            _unitOfWorkMock
                .Setup(x => x.Bookings)
                .Returns(_bookingRepoMock.Object);

            _service = new BookingService(
                _unitOfWorkMock.Object,
                _otpServiceMock.Object,
                _smsServiceMock.Object,
                _loggerMock.Object,
                _identityServiceMock.Object,
                _tokenServiceMock.Object,
                _cacheServiceMock.Object
            );
        }

        [Fact]
        public async Task Should_ThrowNotFoundException_WhenBookingNotFound()
        {
            _bookingRepoMock
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync((Booking)null!);

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.GetBookingDetailAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenUserNotOwner()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user2",
                Fullname = "Test User",
                PhoneNumber = "0901234567"
            };

            _bookingRepoMock
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _service.GetBookingDetailAsync(1, "user1"));
        }

        [Fact]
        public async Task Should_ReturnBookingDetail_WhenSuccess()
        {
            var booking = new Booking
            {
                Id = 1,
                UserId = "user1",
                Fullname = "Test User",
                PhoneNumber = "0901234567",
                BookingNote = "Test note",
                Status = BookingStatus.Pending,
                ExpiredAt = DateTime.UtcNow,
                VenueId = 10,
                Venue = new Venue
                {
                    Name = "Test Venue",
                    OwnerId = "owner1"
                },
                TotalPrice = 500000,
                BookingDetails = new List<BookingDetail>
                {
                    new BookingDetail
                    {
                        BookingDate = new DateOnly(2026,1,1),
                        Field = new Field
                        {
                            Name = "Field A"
                        },
                        TimeSlot = new TimeSlot
                        {
                            StartTime = new TimeOnly(8,0,0),
                            EndTime = new TimeOnly(9,0,0)
                        }
                    }
                }
            };

            _bookingRepoMock
                .Setup(x => x.GetBookingDetailByBookingId(1))
                .ReturnsAsync(booking);

            var result = await _service.GetBookingDetailAsync(1, "user1");

            Assert.NotNull(result);
            Assert.Equal(1, result.BookingId);
            Assert.Equal("Test User", result.FullName);
            Assert.Equal("Test Venue", result.VenueName);
            Assert.Equal(500000, result.TotalPrice);
            Assert.Single(result.Details);
        }
    }
}