using Fiebo.Application.DTOs.Field;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class VenueService : IVenueService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapService _mapService;

        public VenueService(
            IUnitOfWork unitOfWork,
            IMapService mapService
            )
        {
            _unitOfWork = unitOfWork;
            _mapService = mapService;
        }

        public async Task<List<VenueInfoResponse>> GetNearbyVenues(
            int? sportTypeId,
            double userLat,
            double userLng,
            int limit,
            double? radiusKm)
        {
            var nearestVenues =
                await _unitOfWork.Venues
                    .GetNearestVenuesAsync(userLat, userLng, sportTypeId, limit, radiusKm);

            if (!nearestVenues.Any())
                return [];

            var locationList = nearestVenues
                                .Select(n => new VenueLocationDto
                                {
                                    VenueId = n.VenueId,
                                    Latitude = n.Lat,
                                    Longitude = n.Lng
                                })
                                .ToList();

            var distances = await _mapService
                    .GetDistancesAsync(userLat, userLng, locationList);

            var result = nearestVenues
                .Select(v =>
                {
                    distances.TryGetValue(v.VenueId, out var distanceKm);

                    return new VenueInfoResponse
                    {
                        VenueId = v.VenueId,
                        VenueName = v.VenueName,
                        Province = v.Province,
                        Ward = v.Ward,
                        AddressDetail = v.AddressDetail,
                        OpenTime = v.OpenTime,
                        CloseTime = v.CloseTime,
                        BookingCount = v.BookingCount,
                        Rating = Math.Round(v.AvgRating, 1),
                        ThumbnailUrl = v.ThumbnailUrl,
                        DistanceKm = Math.Round(distanceKm, 2)
                    };
                })
                .OrderBy(x => x.DistanceKm)
                .ToList();

            return result;
        }

        public async Task<List<VenueInfoResponse>> GetTopBookingVenuesAsync(
            int top,
            double userLat,
            double userLng)
        {
            if (top <= 0) top = 10;

            var stats = await _unitOfWork.Venues
                .GetTopBookingVenueStatsAsync(top);

            var locationList = stats.Select(n => new VenueLocationDto
            {
                VenueId = n.VenueId,
                Latitude = n.Lat,
                Longitude = n.Lng
            }).ToList();

            var distances = await _mapService
                    .GetDistancesAsync(userLat, userLng, locationList);

            return [.. stats
                .Select(v =>
                {
                    distances.TryGetValue(v.VenueId, out var distanceKm);
                    return new VenueInfoResponse
                    {
                        VenueId = v.VenueId,
                        VenueName = v.VenueName,

                        Province = v.Province,
                        Ward = v.Ward,
                        AddressDetail = v.AddressDetail,

                        OpenTime = v.OpenTime,
                        CloseTime = v.CloseTime,

                        Rating = Math.Round(v.AvgRating, 1),

                        ThumbnailUrl = v.ThumbnailUrl,

                        DistanceKm = Math.Round(distanceKm, 2),

                        BookingCount = v.BookingCount
                    };
                })
                .OrderByDescending(x => x.BookingCount)];
        }

        public async Task<VenueDetailResponse?> GetVenueDetail(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetVenueDetailById(venueId);
            if(venue != null)
            {
                return new VenueDetailResponse
                {
                    Venue = venue,
                    Fields = await _unitOfWork.Fields.GetFieldsByVenue(venueId)
                };
            }

            return null;
        }
    }
}
