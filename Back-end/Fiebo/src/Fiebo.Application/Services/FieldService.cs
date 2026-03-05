using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.SportType;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    }
}
