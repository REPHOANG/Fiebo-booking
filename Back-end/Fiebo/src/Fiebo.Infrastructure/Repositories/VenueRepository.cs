using Fiebo.Domain.DTOs.Field;
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

        public async Task<List<Venue>> GetNearestVenuesAsync(
     double userLat,
     double userLng,
     int? sportTypeId,
     int limit,
     double radiusKm)
        {
            double latRange = radiusKm / 111.0;
            double lngRange = radiusKm /
                (111.0 * Math.Cos(userLat * Math.PI / 180));

            const double R = 6371;

            var baseQuery = _context.Venues
                .AsNoTracking()
                .Where(v =>
                    v.Status == VenueStatus.Active &&
                    v.Latitude >= userLat - latRange &&
                    v.Latitude <= userLat + latRange &&
                    v.Longitude >= userLng - lngRange &&
                    v.Longitude <= userLng + lngRange
                );

            if (sportTypeId.HasValue)
            {
                baseQuery = baseQuery.Where(v =>
                    v.Fields.Any(f =>
                        f.SportTypeId == sportTypeId.Value &&
                        f.Status == FieldStatus.Active));
            }

            var query = baseQuery
                .Select(v => new
                {
                    Venue = v,

                    Distance =
                        R * Math.Acos(
                            Math.Cos(userLat * Math.PI / 180) *
                            Math.Cos(v.Latitude * Math.PI / 180) *
                            Math.Cos((v.Longitude - userLng) * Math.PI / 180) +
                            Math.Sin(userLat * Math.PI / 180) *
                            Math.Sin(v.Latitude * Math.PI / 180)
                        )
                })
                .Where(x => x.Distance <= radiusKm)
                .OrderBy(x => x.Distance)
                .Take(limit);

            var venueIds = await query
                .Select(x => x.Venue.Id)
                .ToListAsync();

            return await _context.Venues
                .Where(v => venueIds.Contains(v.Id))
                .Include(v => v.Fields)
                    .ThenInclude(f => f.Images)
                .Include(v => v.Province)
                .Include(v => v.Ward)
                .ToListAsync();
        }
        public async Task<List<Venue>> GetTopBookingVenuesAsync(int top)
        {
            return await _context.Venues
                .AsNoTracking()
                .Where(v => v.Status == VenueStatus.Active)
                .OrderByDescending(v =>
                    v.Fields
                        .SelectMany(f => f.BookingDetails)
                        .Count(bd => bd.Booking.Status == BookingStatus.Completed)
                ).Take(top)
                .Include(v => v.Fields)
                    .ThenInclude(f => f.Images)
                .Include(v => v.Province)
                .Include(v => v.Ward)
                .ToListAsync();
        }

        public async Task<Venue?> GetVenueDetailById(int venueId)
        {
            return await _context.Venues
                        .AsNoTracking()
                        .Where(v => v.Id == venueId && v.Status == VenueStatus.Active)
                        .Include(v => v.Province)
                        .Include(v => v.Ward)
                        .FirstOrDefaultAsync();
        }
    }
}
