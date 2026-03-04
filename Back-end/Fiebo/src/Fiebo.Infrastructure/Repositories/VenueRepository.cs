﻿using Fiebo.Domain.DTOs.Field;
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

        public async Task<PagedResult<VenueInfoStat>> SearchVenuesByFieldAsync(
            string? locationKeyword,
            DateOnly? bookingDate,
            TimeSpan? bookingTime,
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
                .Where(v => v.Status == VenueStatus.Active);

            if (!string.IsNullOrWhiteSpace(locationKeyword))
            {
                var keyword = $"%{locationKeyword.Trim()}%";
                query = query.Where(v =>
                    EF.Functions.Like(v.Name, keyword) ||
                    EF.Functions.Like(v.AddressDetail!, keyword) ||
                    EF.Functions.Like(v.Ward!.Name, keyword) ||
                    EF.Functions.Like(v.Ward!.Province!.Name, keyword));
            }

            if (sportTypeId.HasValue)
            {
                query = query.Where(v =>
                    v.Fields.Any(f =>
                        f.Status == FieldStatus.Active &&
                        f.SportTypeId == sportTypeId.Value));
            }

            if (bookingDate.HasValue)
            {
                var date = bookingDate.Value;
                var dayOfWeek = date.DayOfWeek;

                if (bookingTime.HasValue)
                {
                    var time = bookingTime.Value;

                    query = query.Where(v =>
                        v.Fields.Any(f =>
                            f.Status == FieldStatus.Active &&
                            (!sportTypeId.HasValue || f.SportTypeId == sportTypeId.Value) &&
                            f.TimeSlots.Any(ts =>
                                ts.DayOfWeek == dayOfWeek &&
                                ts.StartTime <= time &&
                                ts.EndTime > time &&
                                !ts.BookingDetails.Any(bd =>
                                    bd.Booking.BookingDate == date &&
                                    (bd.Booking.Status == BookingStatus.Pending ||
                                     bd.Booking.Status == BookingStatus.Booked ||
                                     bd.Booking.Status == BookingStatus.Completed)))));
                }
                else
                {
                    query = query.Where(v =>
                        v.Fields.Any(f =>
                            f.Status == FieldStatus.Active &&
                            (!sportTypeId.HasValue || f.SportTypeId == sportTypeId.Value) &&
                            f.TimeSlots.Any(ts =>
                                ts.DayOfWeek == dayOfWeek &&
                                !ts.BookingDetails.Any(bd =>
                                    bd.Booking.BookingDate == date &&
                                    (bd.Booking.Status == BookingStatus.Pending ||
                                     bd.Booking.Status == BookingStatus.Booked ||
                                     bd.Booking.Status == BookingStatus.Completed)))));
                }
            }

            if (radiusKm.HasValue)
            {
                double latRange = radiusKm.Value / 111.0;
                double lngRange = radiusKm.Value /
                    (111.0 * Math.Cos(userLat * Math.PI / 180));

                query = query.Where(v =>
                    v.Latitude >= userLat - latRange &&
                    v.Latitude <= userLat + latRange &&
                    v.Longitude >= userLng - lngRange &&
                    v.Longitude <= userLng + lngRange);
            }

            var venueStats = await query
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
                    Lat = v.Latitude,
                    Lng = v.Longitude
                })
                .ToListAsync();

            var orderedByDistance = venueStats
                .Select(v => new
                {
                    Data = v,
                    Distance = GeoHelper.Distance(userLat, userLng, v.Lat, v.Lng)
                })
                .Where(x => !radiusKm.HasValue || x.Distance <= radiusKm.Value)
                .OrderBy(x => x.Distance)
                .ToList();

            var totalItems = orderedByDistance.Count;
            var items = orderedByDistance
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.Data)
                .ToList();

            return new PagedResult<VenueInfoStat>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }
    }
}