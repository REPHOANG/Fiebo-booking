using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Moq;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class GetFieldsByVenueTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IFieldRepository> _fieldRepo = new();
        private readonly Mock<IBookingDetailRepository> _bookingDetailRepo = new();

        private readonly FieldService _service;

        public GetFieldsByVenueTests()
        {
            _unitOfWork.Setup(x => x.Fields).Returns(_fieldRepo.Object);
            _unitOfWork.Setup(x => x.BookingDetails).Returns(_bookingDetailRepo.Object);

            _service = new FieldService(_unitOfWork.Object);
        }

        [Fact]
        public async Task Should_ReturnPagedFields_WhenFieldsExist()
        {
            var venueId = 1;

            var fields = new List<Field>
            {
                new Field
                {
                    Id = 1,
                    Name = "Field A",
                    Description = "Test field",
                    SportType = new SportType { Name = "Football" },
                    Images = new List<FieldImage>
                    {
                        new FieldImage { ImageUrl = "img1.jpg" }
                    }
                }
            };

            var pagedFields = new PagedResult<Field>
            {
                Page = 1,
                PageSize = 10,
                TotalItems = 1,
                Items = fields
            };

            _fieldRepo.Setup(x => x.GetFieldsByVenue(venueId, 1, 10))
                .ReturnsAsync(pagedFields);

            _bookingDetailRepo
                .Setup(x => x.CountCompletedBookingByFieldsAsync(It.IsAny<List<int>>()))
                .ReturnsAsync(new Dictionary<int, int>());

            var result = await _service.GetFieldsByVenue(venueId, 1, 10);

            Assert.NotNull(result);
            Assert.Equal(1, result.TotalItems);
            Assert.Single(result.Items);
            Assert.Equal("Field A", result.Items.First().Name);
            Assert.Equal("Football", result.Items.First().SportType);
        }

        [Fact]
        public async Task Should_ReturnEmptyList_WhenNoFields()
        {
            var pagedFields = new PagedResult<Field>
            {
                Page = 1,
                PageSize = 10,
                TotalItems = 0,
                Items = new List<Field>()
            };

            _fieldRepo.Setup(x => x.GetFieldsByVenue(1, 1, 10))
                .ReturnsAsync(pagedFields);

            _bookingDetailRepo
                .Setup(x => x.CountCompletedBookingByFieldsAsync(It.IsAny<List<int>>()))
                .ReturnsAsync(new Dictionary<int, int>());

            var result = await _service.GetFieldsByVenue(1, 1, 10);

            Assert.Empty(result.Items);
        }
    }
}