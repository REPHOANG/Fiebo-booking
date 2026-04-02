using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Moq;
using System.Linq.Expressions;
using Xunit;

namespace Fiebo.Application.Tests.Fields
{
    public class GetOwnerFieldsByVenueTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<IVenueRepository> _venueRepo = new();
        private readonly Mock<IFieldRepository> _fieldRepo = new();
        private readonly Mock<ITimeSlotRepository> _timeSlotRepo = new();

        private readonly FieldService _service;

        private const int VenueId = 1;
        private const string OwnerId = "owner-123";

        public GetOwnerFieldsByVenueTests()
        {
            _unitOfWork.Setup(x => x.Venues).Returns(_venueRepo.Object);
            _unitOfWork.Setup(x => x.Fields).Returns(_fieldRepo.Object);
            _unitOfWork.Setup(x => x.TimeSlots).Returns(_timeSlotRepo.Object);

            _service = new FieldService(_unitOfWork.Object, null!);
        }

        private void SetupVenue(Venue? venue)
        {
            _venueRepo.Setup(x => x.GetByIdAsync(VenueId))
                .ReturnsAsync(venue);
        }

        private void SetupFields(List<Field> fields)
        {
            _fieldRepo.Setup(x => x.GetAllFieldsByVenueAsync(VenueId))
                .ReturnsAsync(fields);
        }

        private void SetupTimeSlots(List<TimeSlot> slots)
        {
            _timeSlotRepo.Setup(x => x.FindAsync(It.IsAny<Expression<Func<TimeSlot, bool>>>()))
                .ReturnsAsync(slots);
        }

        // ================================================================
        //   E1: Venue not found → UnauthorizedException
        // ================================================================

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenVenueNotFound()
        {
            SetupVenue(null);

            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
                () => _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId));

            Assert.Equal("Bạn không có quyền truy cập vào cơ sở này.", ex.Message);
        }

        // ================================================================
        //   E1 / BR-49: Venue belongs to different owner
        // ================================================================

        [Fact]
        public async Task Should_ThrowUnauthorized_WhenVenueBelongsToDifferentOwner()
        {
            SetupVenue(new Venue
            {
                Id = VenueId,
                Name = "Venue A",
                OwnerId = "other-owner-456"
            });

            var ex = await Assert.ThrowsAsync<UnauthorizedException>(
                () => _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId));

            Assert.Equal("Bạn không có quyền truy cập vào cơ sở này.", ex.Message);
        }

        // ================================================================
        //   AF 2.1: No fields → empty list
        // ================================================================

        [Fact]
        public async Task Should_ReturnEmptyList_WhenNoFields()
        {
            SetupVenue(new Venue { Id = VenueId, Name = "Venue A", OwnerId = OwnerId });
            SetupFields([]);
            SetupTimeSlots([]);

            var result = await _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId);

            Assert.NotNull(result);
            Assert.Empty(result);
        }

        // ================================================================
        //   Normal flow: returns fields with correct data
        // ================================================================

        [Fact]
        public async Task Should_ReturnFieldList_WithCorrectMapping()
        {
            SetupVenue(new Venue { Id = VenueId, Name = "Venue A", OwnerId = OwnerId });

            var fields = new List<Field>
            {
                new()
                {
                    Id = 1,
                    Name = "Sân 5A",
                    SportTypeId = 10,
                    VenueId = VenueId,
                    Status = FieldStatus.Active,
                    SportType = new SportType { Id = 10, Name = "Bóng đá" }
                },
                new()
                {
                    Id = 2,
                    Name = "Sân Cầu Lông 1",
                    SportTypeId = 20,
                    VenueId = VenueId,
                    Status = FieldStatus.Inactive,
                    SportType = new SportType { Id = 20, Name = "Cầu lông" }
                }
            };
            SetupFields(fields);

            var timeSlots = new List<TimeSlot>
            {
                new() { VenueId = VenueId, SportTypeId = 10, Price = 200_000 },
                new() { VenueId = VenueId, SportTypeId = 10, Price = 350_000 },
                new() { VenueId = VenueId, SportTypeId = 20, Price = 80_000 },
                new() { VenueId = VenueId, SportTypeId = 20, Price = 120_000 },
            };
            SetupTimeSlots(timeSlots);

            var result = await _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId);

            Assert.Equal(2, result.Count);

            var football = result.First(f => f.FieldId == 1);
            Assert.Equal("Sân 5A", football.FieldName);
            Assert.Equal("Bóng đá", football.SportType);
            Assert.Equal("Active", football.Status);
            Assert.Equal(200_000, football.MinPrice);
            Assert.Equal(350_000, football.MaxPrice);

            var badminton = result.First(f => f.FieldId == 2);
            Assert.Equal("Sân Cầu Lông 1", badminton.FieldName);
            Assert.Equal("Cầu lông", badminton.SportType);
            Assert.Equal("Inactive", badminton.Status);
            Assert.Equal(80_000, badminton.MinPrice);
            Assert.Equal(120_000, badminton.MaxPrice);
        }

        // ================================================================
        //   Price = 0 when no time slots exist for that sport type
        // ================================================================

        [Fact]
        public async Task Should_ReturnZeroPrice_WhenNoTimeSlotsForSportType()
        {
            SetupVenue(new Venue { Id = VenueId, Name = "Venue A", OwnerId = OwnerId });

            var fields = new List<Field>
            {
                new()
                {
                    Id = 1,
                    Name = "Sân Tennis 1",
                    SportTypeId = 30,
                    VenueId = VenueId,
                    Status = FieldStatus.Active,
                    SportType = new SportType { Id = 30, Name = "Tennis" }
                }
            };
            SetupFields(fields);
            SetupTimeSlots([]);

            var result = await _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId);

            Assert.Single(result);
            Assert.Equal(0, result[0].MinPrice);
            Assert.Equal(0, result[0].MaxPrice);
        }

        // ================================================================
        //   Multiple fields share same sport type → same price range
        // ================================================================

        [Fact]
        public async Task Should_SharePriceRange_WhenFieldsHaveSameSportType()
        {
            SetupVenue(new Venue { Id = VenueId, Name = "Venue A", OwnerId = OwnerId });

            var fields = new List<Field>
            {
                new()
                {
                    Id = 1, Name = "Sân 5A", SportTypeId = 10, VenueId = VenueId,
                    Status = FieldStatus.Active,
                    SportType = new SportType { Id = 10, Name = "Bóng đá" }
                },
                new()
                {
                    Id = 2, Name = "Sân 5B", SportTypeId = 10, VenueId = VenueId,
                    Status = FieldStatus.Active,
                    SportType = new SportType { Id = 10, Name = "Bóng đá" }
                }
            };
            SetupFields(fields);

            var timeSlots = new List<TimeSlot>
            {
                new() { VenueId = VenueId, SportTypeId = 10, Price = 150_000 },
                new() { VenueId = VenueId, SportTypeId = 10, Price = 300_000 },
            };
            SetupTimeSlots(timeSlots);

            var result = await _service.GetOwnerFieldsByVenueAsync(VenueId, OwnerId);

            Assert.Equal(2, result.Count);
            Assert.All(result, f =>
            {
                Assert.Equal(150_000, f.MinPrice);
                Assert.Equal(300_000, f.MaxPrice);
            });
        }
    }
}
