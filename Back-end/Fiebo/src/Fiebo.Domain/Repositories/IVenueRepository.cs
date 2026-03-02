using Fiebo.Domain.DTOs.Field;
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
        Task<List<VenueInfoStat>> GetNearestVenuesAsync(
    double userLat,
    double userLng,
    int? sportTypeId,
    int limit,
    double radiusKm);

        Task<List<VenueInfoStat>> GetTopBookingVenueStatsAsync(int top);
    }
}
