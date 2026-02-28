using Fiebo.Domain.DTO.Field;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
using Fiebo.Infrastructure.Helper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Repositories
{
    public class VenueRepository : Repository<Venue>, IVenueRepository
    {
        public VenueRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<VenueLocationDto>> GetNearestVenueIdsByAirAsync(
            double userLat,
            double userLng,
            int? sportTypeId,
            int limit = 5)
        {
            var query = _context.Fields
                .Where(f => f.Status == FieldStatus.Active);

            if (sportTypeId.HasValue)
            {
                query = query.Where(f => f.SportTypeId == sportTypeId.Value);
            }

            var venues = await query
                .Where(f => f.Venue != null)
                .GroupBy(f => f.VenueId)
                .Select(g => new
                {
                    VenueId = g.Key,

                    Lat = (double)g.First().Venue!.Latitude,
                    Lng = (double)g.First().Venue!.Longitude
                })
                .ToListAsync();


            var result = venues
                .Select(v => new
                {
                    v.VenueId,
                    v.Lat,
                    v.Lng,

                    Distance = GeoHelper.Distance(
                        userLat, userLng,
                        v.Lat, v.Lng)
                })
                .OrderBy(x => x.Distance)
                .Take(limit)
                .Select(x => new VenueLocationDto
                {
                    VenueId = x.VenueId,
                    Lat = x.Lat,
                    Lng = x.Lng
                })
                .ToList();

            return result;
        }

        public async Task<List<Venue>> GetNearbyVenuesInfoAsync(List<int> venueIds)
        {
            return await _context.Venues
                .Where(v => venueIds.Contains(v.Id))
                .Include(v => v.Ward)
                    .ThenInclude(w => w!.Province)
                .Include(v => v.Fields)
                    .ThenInclude(f => f.Images)
                .Include(f => f.Reviews)
                .ToListAsync();
        }


    }
}
