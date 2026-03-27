using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Tests.Venues
{
    public class GetTopBookingVenuesTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IMapService> _mapService = new();
        private readonly Mock<IVenueRepository> _venueRepo = new();
        private readonly Mock<IReviewRepository> _reviewRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingRepo = new();

        private readonly VenueService _service;

        public GetTopBookingVenuesTests()
        {
            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
            _unitOfWork.Setup(x => x.Reviews).Returns(_reviewRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingRepo.Object);

            _service = new VenueService(_unitOfWork.Object, _mapService.Object, null!, null!, null!);
        }

        [Fact]
        public async Task Should_ReturnEmpty_WhenNoVenue()
        {
            _venueRepo.Setup(x => x.GetTopBookingVenuesAsync(It.IsAny<int>()))
                .ReturnsAsync(new List<Venue>());

            var result = await _service.GetTopBookingVenuesAsync(10, 10, 10);

            Assert.Empty(result);
        }

        [Fact]
        public async Task Should_ReturnSortedVenue()
        {
            var venues = new List<Venue>
        {
            new Venue { Id = 1, Name = "Venue A", Latitude = 1, Longitude = 1, OwnerId = "owner1" }
        };

            _venueRepo.Setup(x => x.GetTopBookingVenuesAsync(10))
                .ReturnsAsync(venues);

            _mapService.Setup(x => x.GetDistancesAsync(
                It.IsAny<double>(),
                It.IsAny<double>(),
                It.IsAny<List<VenueLocationDto>>()))
                .ReturnsAsync(new Dictionary<int, double> { { 1, 1.5 } });

            _reviewRepo.Setup(x => x.GetAveragesByVenueAsync(It.IsAny<List<int>>()))
                .ReturnsAsync(new Dictionary<int, double> { { 1, 4 } });

            _bookingRepo.Setup(x => x.CountCompletedBookingsByVenueAsync(It.IsAny<List<int>>()))
                .ReturnsAsync(new Dictionary<int, int> { { 1, 20 } });

            var result = await _service.GetTopBookingVenuesAsync(10, 10, 10);

            Assert.Single(result);
            Assert.Equal("Venue A", result[0].VenueName);
        }
    }
}
