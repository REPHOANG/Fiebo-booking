using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;

namespace Fiebo.Application.Services
{
    public class SportTypeService : ISportTypeService
    {
        private readonly IUnitOfWork _unitOfWork;

        public SportTypeService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<int> CreateSportTypeAsync(CreateSportTypeRequest request, CancellationToken cancellationToken = default)
        {
            var isExists = await _unitOfWork.SportTypes.IsNameExistsAsync(request.Name, null, cancellationToken);

            if (isExists)
            {
                throw new ResourceConflictException($"Tên môn thể thao '{request.Name}' đã tồn tại trong hệ thống.");
            }

            var sportType = new SportType
            {
                Name = request.Name
            };

            _unitOfWork.SportTypes.Add(sportType);
            await _unitOfWork.SaveChangesAsync();

            return sportType.Id;
        }
        public async Task<SportTypeResponse> GetSportTypeByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            var sportType = await _unitOfWork.SportTypes.GetByIdAsync(id, cancellationToken);

            if (sportType == null)
            {
                throw new NotFoundException("Không tìm thấy môn thể thao.");
            }

            return new SportTypeResponse
            {
                Id = sportType.Id,
                Name = sportType.Name
            };
        }
        public async Task UpdateSportTypeAsync(int id, UpdateSportTypeRequest request, CancellationToken cancellationToken = default)
        {
            var sportType = await _unitOfWork.SportTypes.GetByIdAsync(id, cancellationToken);
            if (sportType == null)
            {
                throw new NotFoundException("Không tìm thấy môn thể thao.");
            }

            var isExists = await _unitOfWork.SportTypes.IsNameExistsAsync(request.Name, id, cancellationToken);
            if (isExists)
            {
                throw new ResourceConflictException($"Tên môn thể thao '{request.Name}' đã tồn tại trong hệ thống.");
            }

            sportType.Name = request.Name;

            _unitOfWork.SportTypes.Update(sportType);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}