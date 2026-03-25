using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Shared;


namespace Fiebo.Application.Interfaces
{
    public interface IFieldService
    {
        Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize);
        Task<List<SportTypeResponse>> GetAllSportTypes();
        Task<List<OwnerFieldListItemResponse>> GetOwnerFieldsByVenueAsync(int venueId, string ownerId);
        Task ChangeFieldStatusAsync(int venueId, int fieldId, FieldStatus newStatus, string userId);
    }
}
