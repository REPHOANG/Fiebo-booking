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
    public class GetVenueDetailTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IVenueRepository> _venueRepo = new();
        private readonly Mock<IReviewRepository> _reviewRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingRepo = new();

        private readonly VenueService _service;

        public GetVenueDetailTests()
        {
            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
            _unitOfWork.Setup(x => x.Reviews).Returns(_reviewRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingRepo.Object);

            _service = new VenueService(_unitOfWork.Object, null!, null!, null!, null!);
        }

        //[Fact]
        //public async Task Should_ReturnNull_WhenVenueNotFound()
        //{
        //    _venueRepo.Setup(x => x.GetVenueDetailById(1))
        //        .ReturnsAsync((Venue)null!);

        //    var result = await _service.GetVenueDetail(1);

        //    Assert.Null(result);
        //}

        //[Fact]
        //public async Task Should_ReturnVenueDetail_WhenFound()
        //{
        //    var venue = new Venue { Id = 1, Name = "Venue A", OwnerId = "owner1" };

        //    _venueRepo.Setup(x => x.GetVenueDetailById(1))
        //        .ReturnsAsync(venue);

        //    _reviewRepo.Setup(x => x.GetAverageByVenueAsync(1)).ReturnsAsync(4);
        //    _reviewRepo.Setup(x => x.CountByVenueAsync(1)).ReturnsAsync(10);
        //    _bookingRepo.Setup(x => x.CountCompletedBookingByVenueAsync(1)).ReturnsAsync(20);

        //    var result = await _service.GetVenueDetail(1);

        //    Assert.NotNull(result);
        //    Assert.Equal("Venue A", result.Name);
        //}
    }
}
