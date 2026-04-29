using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Shared;
using Microsoft.AspNetCore.Http;


namespace Fiebo.Application.Interfaces
{
    public interface IFieldService
    {
        Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize);
        Task<List<SportTypeResponse>> GetAllSportTypes();
Task<List<OwnerFieldListItemResponse>> GetOwnerFieldsByVenueAsync(int venueId, string ownerId, string? role);        Task<int> CreateFieldAsync(int venueId, CreateFieldRequest request, string userId);
        Task UpdateFieldAsync(UpdateFieldRequest request, string? userId, int fieldId);
        Task UploadFieldImage(int fieldId, string? userId, List<IFormFile> files);
        Task DeleteFieldImage(string publicId, string? userId);
        Task ChangeFieldStatusAsync(int venueId, int fieldId, string ownerId);
        Task<OwnerFieldDetailResponse> GetOwnerFieldDetailAsync(int id, string? ownerId, string? role);
    }
}
