using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;


namespace Fiebo.Application.Interfaces
{
    public interface IFieldService
    {
        Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize);
        Task<List<SportTypeResponse>> GetAllSportTypes();
    }
}
