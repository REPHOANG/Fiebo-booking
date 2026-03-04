using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IVenueService
    {
        Task<List<VenueInfoResponse>> GetNearbyVenues(
            int? sportTypeId,
            double userLat,
            double userLng,
            int limit,
            double radiusKm);
        Task<List<VenueInfoResponse>> GetTopBookingVenuesAsync(
            int top,
            double userLat,
            double userLng);

        Task<VenueDetailResponse?> GetVenueDetail(int venueId);
        Task<PagedResult<ReviewDTO>> GetReviewsByVenue(
            int venueId,
            int page,
            int pageSize,
            string? sort);
    }
}
