using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class FieldService : IFieldService
    {
        private readonly IUnitOfWork _unitOfWork;
        public FieldService(
            IUnitOfWork unitOfWork
            )
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<PagedResult<FieldsDetailDTO>> GetFieldsByVenue(int venueId, int page, int pageSize)
        {
            var fields = await _unitOfWork.Fields.GetFieldsByVenue(venueId, page, pageSize);
            var fieldIds = fields.Items.Select(f => f.Id).ToList();
            var bookingCounts =
                await _unitOfWork.BookingDetails
                    .CountCompletedBookingByFieldsAsync(fieldIds);

            return new PagedResult<FieldsDetailDTO>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = fields.TotalItems,
                Items = [.. fields.Items.Select(f => new FieldsDetailDTO
                {

                    Name = f.Name,
                    Description = f.Description,
                    SportType = f.SportType!.Name,
                    Images = f.Images.Select(i => i.ImageUrl).ToList()
                })]
            };
        }

        public async Task<List<SportTypeResponse>> GetAllSportTypes()
        {
            var result = await _unitOfWork.SportTypes.GetAllAsync();
            return [.. result.Select(st => new SportTypeResponse
            {
                Id = st.Id,
                Name = st.Name
            })];
        }

        public async Task<List<OwnerFieldListItemResponse>> GetOwnerFieldsByVenueAsync(int venueId, string ownerId)
        {
            // BR-49 / E1: Verify venue exists and belongs to the current Field Owner
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null || venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền truy cập vào cơ sở này.");
            }

            var fields = await _unitOfWork.Fields.GetAllFieldsByVenueAsync(venueId);

            var allTimeSlots = (await _unitOfWork.TimeSlots
                .FindAsync(ts => ts.VenueId == venueId))
                .ToList();

            var priceBySportType = allTimeSlots
                .GroupBy(ts => ts.SportTypeId)
                .ToDictionary(
                    g => g.Key,
                    g => (Min: g.Min(ts => ts.Price), Max: g.Max(ts => ts.Price))
                );

            return fields.Select(f =>
            {
                priceBySportType.TryGetValue(f.SportTypeId, out var priceRange);
                return new OwnerFieldListItemResponse
                {
                    FieldId = f.Id,
                    FieldName = f.Name,
                    SportType = f.SportType?.Name ?? "N/A",
                    Status = f.Status.ToString(),
                    MinPrice = priceRange.Min,
                    MaxPrice = priceRange.Max
                };
            }).ToList();
        }
    }
}
