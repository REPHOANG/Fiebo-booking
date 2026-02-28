using Fiebo.Domain.DTO.Field;
using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IVenueRepository : IRepository<Venue>
    {
        Task<List<VenueLocationDto>> GetNearestVenueIdsByAirAsync(
            double userLat,
            double userLng,
            int? sportTypeId,
            int limit = 5);
        Task<List<Venue>> GetNearbyVenuesInfoAsync(List<int> ids);
    }
}
