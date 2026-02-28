using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTO.Field;
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

        public async Task<List<NearbyFieldResponse>> GetNearbyVenues(double userLat, double userLng, int? sportTypeId, int limit = 5)
        {
            var nearestFields = await _unitOfWork.Venues.GetNearestVenueIdsByAirAsync(userLat, userLng, sportTypeId, limit);
            if (nearestFields.Count == 0)
            {
                return [];
            }
            var listVenueId = new List<int>();

            foreach (var venue in nearestFields)
            {
                listVenueId.Add(venue.VenueId);
            }

            var fields = await _unitOfWork.Venues.GetNearbyVenuesInfoAsync(listVenueId);
            var distances = await _mapService.GetDistancesAsync(userLat, userLng, nearestFields);
            var result = new List<NearbyFieldResponse>();

            foreach (var x in fields)
            {
                distances.TryGetValue(x.Id, out var distanceKm);

                var thumbnail = x.Fields
                    .SelectMany(f => f.Images)
                    .Select(i => i.ImageUrl)
                    .FirstOrDefault();

                var avgRating = x.Reviews.Any() ? Math.Round(x.Reviews.Average(r => r.Rating), 1) : 0;

                result.Add(new NearbyFieldResponse
                {
                    VenueId = x.Id,
                    VenueName = x.Name,

                    Province = x.Ward!.Province!.Name,
                    Ward = x.Ward!.Name,
                    AddressDetail = x.AddressDetail,

                    OpenTime = x.OpenTime,
                    CloseTime = x.CloseTime,

                    Rating = avgRating,

                    ThumbnailUrl = thumbnail,

                    DistanceKm = Math.Round(distanceKm, 2)
                });
            }
            return result;
        }

    }
}
