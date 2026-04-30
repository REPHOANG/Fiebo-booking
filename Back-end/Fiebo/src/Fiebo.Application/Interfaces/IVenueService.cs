using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Review;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Interfaces
{
    public interface IVenueService
    {
        Task<List<VenueInfoResponse>> GetNearbyVenues(
            int? sportTypeId,
            double userLat,
            double userLng,
            int limit,
            double? radiusKm);
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

        Task<PagedResult<VenueInfoResponse>> SearchVenuesByFieldAsync(
    SearchFieldsRequest request);
        Task<VenueSlotsResponse> GetVenueSchedule(int venueId, DateOnly date);
        Task<List<OwnerVenueListResponse>> GetVenuesByOwnerAsync(string ownerId);
        Task DeactivateVenueAsync(int venueId, string ownerId);
        Task<VenueSlotsResponse> GetOwnerVenueScheduleAsync(int venueId, string ownerId, DateOnly date);
        Task<CreateVenueResponse> CreateVenueAsync(CreateVenueRequest request, string? ownerId);
        Task UploadVenueDocumentAsync(int venueId, string? ownerId, CreateVenueDocumentRequest document);
        Task<OwnerVenueDetailResponse> GetOwnerVenueDetailAsync(int venueId, string? ownerId, string? role);
        Task SubmitVenueDraftAsync(int venueId, string? ownerId);
        Task UpdateVenueAsync(int venueId, UpdateVenueRequest request, string ownerId);
        Task<int> AddVenueServiceAsync(int venueId, string ownerId, AddVenueServiceRequest request);
        Task UpdateVenueServiceAsync(int serviceId, string ownerId, UpdateVenueServiceRequest request, CancellationToken cancellationToken = default);
        Task DeleteVenueServiceAsync(int serviceId, string ownerId, CancellationToken cancellationToken = default);
        Task<PagedResult<VenueServiceDetailResponse>> GetVenueServicesAsync(int venueId, GetVenueServicesRequest request, CancellationToken cancellationToken = default);
        Task<List<OwnerVenueSelectOptionResponse>> GetOwnerVenueSelectOptionAsync(string? ownerId);
        Task UpdateVenueDocumentAsync(int documentId, string? ownerId, UpdateVenueDocumentRequest request);
        Task<List<VenueMapResponse>> GetVenueMapAsync(int? sportTypeId);
        Task ResubmitVenueAsync(int venueId, string? ownerId, ResubmitVenueRequest request);
    }
}
