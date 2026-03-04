using Fiebo.Application.DTOs.Field;
using Fiebo.Domain.Shared;


namespace Fiebo.Application.Interfaces
{
    public interface IFieldService
    {
        Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize);
    }
}
