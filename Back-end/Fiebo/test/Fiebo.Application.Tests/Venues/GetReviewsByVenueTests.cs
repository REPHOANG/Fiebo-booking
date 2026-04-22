using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Tests.Venues
{
    public class GetReviewsByVenueTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IReviewRepository> _reviewRepo = new();
        private readonly Mock<IIdentityService> _identityService = new();

        private readonly VenueService _service;

        public GetReviewsByVenueTests()
        {
            _unitOfWork.Setup(x => x.Reviews).Returns(_reviewRepo.Object);

            _service = new VenueService(_unitOfWork.Object, null!, _identityService.Object, null!, null!, null!);
        }

        //[Fact]
        //public async Task Should_ReturnPagedReviews()
        //{
        //    var reviews = new List<Review>
        //{
        //    new Review
        //    {
        //        UserId = "user1",
        //        Rating = 5,
        //        Comment = "Great",
        //        Images = new List<ReviewImage>()
        //    }
        //};

        //    var paged = new PagedResult<Review>
        //    {
        //        Page = 1,
        //        PageSize = 10,
        //        TotalItems = 1,
        //        Items = reviews
        //    };

        //    _reviewRepo.Setup(x => x.GetByVenueAsync(1, 1, 10, null))
        //        .ReturnsAsync(paged);

        //    _identityService.Setup(x => x.GetUserFullNameAsync(It.IsAny<List<string>>()))
        //        .ReturnsAsync(new Dictionary<string, string> { { "user1", "Test User" } });

        //    var result = await _service.GetReviewsByVenue(1, 1, 10, null);

        //    Assert.Single(result.Items);
        //    Assert.Equal("Test User", result.Items[0].Name);
        //}
    }
}
