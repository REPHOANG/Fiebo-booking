using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Fiebo.Persistence.Data;
using Fiebo.Persistence.Helper;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories
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
                .AsNoTracking()
                .AsSplitQuery()
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
                .AsSplitQuery()
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
                        .AsSplitQuery()
                        .Where(v => v.Id == venueId && v.Status == VenueStatus.Active)
                        .Include(v => v.Province)
                        .Include(v => v.Ward)
                        .FirstOrDefaultAsync();
        }

        public async Task<PagedResult<Venue>> SearchVenuesByFieldAsync(
            string? locationKeyword,
            DateOnly? bookingDate,
            TimeOnly? bookingTime,
            int? sportTypeId,
            double userLat,
            double userLng,
            int page,
            int pageSize,
            double? radiusKm)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            var query = _context.Venues
                .AsNoTracking()
                .Where(v => v.Status == VenueStatus.Active);

            query = ApplyLocationFilter(query, locationKeyword);
            query = ApplySportTypeFilter(query, sportTypeId);
            query = ApplyAvailabilityFilter(query, bookingDate, bookingTime, sportTypeId);
            query = ApplyRadiusBoundingBoxFilter(query, userLat, userLng, radiusKm);

            var venueCoordinates = await query
                .Select(v => new { v.Id, v.Latitude, v.Longitude })
                .ToListAsync();

            var orderedIds = venueCoordinates
                .Select(v => new
                {
                    v.Id,
                    Distance = GeoHelper.Distance(userLat, userLng, v.Latitude, v.Longitude)
                })
                .Where(x => !radiusKm.HasValue || x.Distance <= radiusKm.Value)
                .OrderBy(x => x.Distance)
                .Select(x => x.Id)
                .ToList();

            var totalItems = orderedIds.Count;
            var pagedIds = orderedIds
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            if (pagedIds.Count == 0)
            {
                return new PagedResult<Venue>
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalItems = totalItems,
                    Items = []
                };
            }

            var venues = await _context.Venues
                .AsNoTracking()
                .Where(v => pagedIds.Contains(v.Id))
                .Include(v => v.Province)
                .Include(v => v.Ward)
                    .ThenInclude(w => w!.Province)
                .Include(v => v.Fields)
                    .ThenInclude(f => f.Images)
                .ToListAsync();

            var orderMap = pagedIds
                .Select((id, index) => new { id, index })
                .ToDictionary(x => x.id, x => x.index);

            var orderedVenues = venues
                .OrderBy(v => orderMap[v.Id])
                .ToList();

            return new PagedResult<Venue>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = orderedVenues
            };
        }

        private static IQueryable<Venue> ApplyLocationFilter(
            IQueryable<Venue> query,
            string? locationKeyword)
        {
            if (string.IsNullOrWhiteSpace(locationKeyword))
            {
                return query;
            }

            var keyword = $"%{locationKeyword.Trim()}%";
            return query.Where(v =>
                EF.Functions.Like(v.Name, keyword) ||
                EF.Functions.Like(v.AddressDetail!, keyword) ||
                EF.Functions.Like(v.Ward!.Name, keyword) ||
                EF.Functions.Like(v.Ward!.Province!.Name, keyword));
        }

        private static IQueryable<Venue> ApplySportTypeFilter(
            IQueryable<Venue> query,
            int? sportTypeId)
        {
            if (!sportTypeId.HasValue)
            {
                return query;
            }

            return query.Where(v =>
                v.Fields.Any(f =>
                    f.Status == FieldStatus.Active &&
                    f.SportTypeId == sportTypeId.Value));
        }

        private static IQueryable<Venue> ApplyAvailabilityFilter(
            IQueryable<Venue> query,
            DateOnly? bookingDate,
            TimeOnly? bookingTime,
            int? sportTypeId)
        {
            if (!bookingDate.HasValue)
            {
                return query;
            }

            var date = bookingDate.Value;
            var dayOfWeek = date.DayOfWeek;

            if (bookingTime.HasValue)
            {
                var time = bookingTime.Value;
                return query.Where(v =>
                    v.Fields.Any(f =>
                        f.Status == FieldStatus.Active &&
                        (!sportTypeId.HasValue || f.SportTypeId == sportTypeId.Value) &&
                        f.Venue!.TimeSlots.Any(ts =>
                            ts.DayOfWeek == dayOfWeek &&
                            ts.StartTime <= time &&
                            ts.EndTime > time &&
                            !ts.BookingDetails.Any(bd =>
                                bd.Booking.BookingDate == date &&
                                (bd.Booking.Status == BookingStatus.Pending ||
                                 bd.Booking.Status == BookingStatus.Booked ||
                                 bd.Booking.Status == BookingStatus.Completed)))));
            }

            return query.Where(v =>
                v.Fields.Any(f =>
                    f.Status == FieldStatus.Active &&
                    (!sportTypeId.HasValue || f.SportTypeId == sportTypeId.Value) &&
                    f.Venue!.TimeSlots.Any(ts =>
                        ts.DayOfWeek == dayOfWeek &&
                        !ts.BookingDetails.Any(bd =>
                            bd.Booking.BookingDate == date &&
                            (bd.Booking.Status == BookingStatus.Pending ||
                             bd.Booking.Status == BookingStatus.Booked ||
                             bd.Booking.Status == BookingStatus.Completed)))));
        }

        private static IQueryable<Venue> ApplyRadiusBoundingBoxFilter(
            IQueryable<Venue> query,
            double userLat,
            double userLng,
            double? radiusKm)
        {
            if (!radiusKm.HasValue)
            {
                return query;
            }

            var latRange = radiusKm.Value / 111.0;
            var lngRange = radiusKm.Value / (111.0 * Math.Cos(userLat * Math.PI / 180));

            return query.Where(v =>
                v.Latitude >= userLat - latRange &&
                v.Latitude <= userLat + latRange &&
                v.Longitude >= userLng - lngRange &&
                v.Longitude <= userLng + lngRange);
        }

        public async Task<List<Venue>> GetVenuesByOwnerAsync(string ownerId)
        {
            return await _context.Venues
                .AsNoTracking()
                .AsSplitQuery()
                .Where(v => v.OwnerId == ownerId && v.Status == VenueStatus.Active)
                .Include(v => v.Province)
                .Include(v => v.Ward)
                .Include(v => v.Fields)
                .ToListAsync();
        }

        public async Task<List<Venue>> GetVenuesWithStaffAsync(string ownerId)
        {
            return await _context.Venues
                .AsNoTracking()
                .Where(v => v.OwnerId == ownerId)
                .Include(v => v.VenueStaffs)
                .ToListAsync();
        }

        public async Task<Venue?> GetVenueWithDocumentsAsync(int venueId)
        {
            return await _context.Venues
                .AsNoTracking()
                .AsSplitQuery()
                .Where(v => v.Id == venueId)
                .Include(v => v.Province)
                .Include(v => v.Ward)
                .Include(v => v.Documents)
                .ThenInclude(d => d.Images)
                .FirstOrDefaultAsync();
        }
    }
}
