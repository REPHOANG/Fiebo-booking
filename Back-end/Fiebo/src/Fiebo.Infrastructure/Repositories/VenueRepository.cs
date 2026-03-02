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

        public async Task<List<VenueInfoStat>> GetNearestVenuesAsync(
    double userLat,
    double userLng,
    int? sportTypeId,
    int limit,
    double radiusKm)
        {
            double latRange = radiusKm / 111.0;
            double lngRange = radiusKm / (111.0 * Math.Cos(userLat * Math.PI / 180));

            var query = _context.Venues
                .Where(v =>
                    v.Status == VenueStatus.Active &&
                    v.Latitude >= userLat - latRange &&
                    v.Latitude <= userLat + latRange &&
                    v.Longitude >= userLng - lngRange &&
                    v.Longitude <= userLng + lngRange
                );

            if (sportTypeId.HasValue)
            {
                query = query.Where(v =>
                    v.Fields.Any(f => f.SportTypeId == sportTypeId));
            }

            var result = query
                .Select(v => new VenueInfoStat
                {
                    VenueId = v.Id,
                    VenueName = v.Name,

                    Province = v.Province!.Name,
                    Ward = v.Ward!.Name,
                    AddressDetail = v.AddressDetail,
                    OpenTime = v.OpenTime,
                    CloseTime = v.CloseTime,

                    BookingCount = v.Fields
                        .SelectMany(f => f.BookingDetails)
                        .Count(bd => bd.Booking.Status == BookingStatus.Completed),

                    AvgRating = v.Fields
                        .SelectMany(f => f.BookingDetails)
                        .SelectMany(b => b.Reviews)
                        .Select(r => (double?)r.Rating)
                        .Average() ?? 0,

                    ThumbnailUrl = v.Fields
                        .SelectMany(f => f.Images)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault(),

                    Lat = v.Latitude,
                    Lng = v.Longitude
                })
                .AsEnumerable()
                .Select(v => new
                {
                    Data = v,
                    Distance = GeoHelper.Distance(
                        userLat, userLng,
                        v.Lat, v.Lng)
                })
                .Where(x => x.Distance <= radiusKm)
                .OrderBy(x => x.Distance)
                .Take(limit)
                .Select(x => x.Data)
                .ToList();

            return result;
        }

        public async Task<List<VenueInfoStat>> GetTopBookingVenueStatsAsync(int top)
        {
            return await _context.Venues
                .Where(v => v.Status == VenueStatus.Active)
                .Select(v => new VenueInfoStat
                {
                    VenueId = v.Id,
                    VenueName = v.Name,
                    Province = v.Ward!.Province!.Name,
                    Ward = v.Ward!.Name,
                    AddressDetail = v.AddressDetail,
                    OpenTime = v.OpenTime,
                    CloseTime = v.CloseTime,
                    BookingCount = v.Fields
                        .SelectMany(f => f.BookingDetails)
                        .Count(bd => bd.Booking.Status == BookingStatus.Completed),
                    AvgRating = v.Fields
                        .SelectMany(f => f.BookingDetails)
                        .SelectMany(b => b.Reviews)
                        .Select(r => (double?)r.Rating)
                        .Average() ?? 0,
                    ThumbnailUrl = v.Fields
                        .SelectMany(f => f.Images)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault(),
                    Lat = (double)v.Latitude,
                    Lng = (double)v.Longitude
                })
                .OrderByDescending(x => x.BookingCount)
                .Take(top)
                .ToListAsync();
        }
    }
}
