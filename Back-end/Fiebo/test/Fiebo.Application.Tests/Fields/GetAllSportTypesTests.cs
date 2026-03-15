using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fiebo.Application.Services;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Moq;
using Xunit;

namespace Fiebo.Application.Tests.SportTypes
{
    public class GetAllSportTypesTests
    {
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly Mock<ISportTypeRepository> _sportTypeRepo = new();

        private readonly FieldService _service;

        public GetAllSportTypesTests()
        {
            _unitOfWork.Setup(x => x.SportTypes).Returns(_sportTypeRepo.Object);

            _service = new FieldService(_unitOfWork.Object);
        }

        [Fact]
        public async Task Should_ReturnSportTypes_WhenExist()
        {
            var sportTypes = new List<SportType>
            {
                new SportType { Id = 1, Name = "Football" },
                new SportType { Id = 2, Name = "Badminton" }
            };

            _sportTypeRepo.Setup(x => x.GetAllAsync())
                .ReturnsAsync(sportTypes);

            var result = await _service.GetAllSportTypes();

            Assert.Equal(2, result.Count);
            Assert.Equal("Football", result.First().Name);
        }

        [Fact]
        public async Task Should_ReturnEmptyList_WhenNoSportTypes()
        {
            _sportTypeRepo.Setup(x => x.GetAllAsync())
                .ReturnsAsync(new List<SportType>());

            var result = await _service.GetAllSportTypes();

            Assert.Empty(result);
        }
    }
}