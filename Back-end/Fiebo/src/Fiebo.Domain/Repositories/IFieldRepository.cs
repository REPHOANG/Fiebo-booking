using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IFieldRepository : IRepository<Field>
    {
        Task<PagedResult<Field>> GetFieldsByVenue(int venueId, int page, int pageSize);
        Task<List<SportType>> GetSportTypesByVenueAsync(int venueId);
        Task<List<Field>> GetFieldsWithBookingsAsync(int venueId, DateOnly date);
        Task<List<Field>> GetAllFieldsByVenueAsync(int venueId);
        Task<bool> IsFieldNameExistsInVenueAsync(int venueId, string fieldName);
    }
}
