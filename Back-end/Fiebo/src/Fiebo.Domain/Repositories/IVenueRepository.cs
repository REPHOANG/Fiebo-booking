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
        Task<List<Venue>> GetNearestVenuesAsync(
            double userLat,
            double userLng,
            int? sportTypeId,
            int limit,
            double radiusKm);

        Task<List<Venue>> GetTopBookingVenuesAsync(int top);

        Task<Venue?> GetVenueDetailById(int venueId);
    }
}
