using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class AdminVenueService : IAdminVenueService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IIdentityService _identityService;
        private readonly INotificationService _notificationService;

        public AdminVenueService(
            IUnitOfWork unitOfWork,
            IIdentityService identityService,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _identityService = identityService;
            _notificationService = notificationService;
        }

        public async Task<PagedResult<PendingVenueListItemResponse>> GetPendingVenuesAsync(int page, int pageSize)
        {
            var result = await _unitOfWork.Venues.GetPendingVenuesAsync(page, pageSize);

            if (result.TotalItems == 0)
            {
                return new PagedResult<PendingVenueListItemResponse>
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalItems = 0,
                    Items = []
                };
            }

            var ownerIds = result.Items.Select(v => v.OwnerId).Distinct().ToList();
            var ownerNames = await _identityService.GetUserFullNameAsync(ownerIds);

            var items = result.Items.Select(v => new PendingVenueListItemResponse
            {
                VenueId = v.Id,
                VenueName = v.Name,
                OwnerName = ownerNames.GetValueOrDefault(v.OwnerId, "Unknown Owner"),
                SubmittedDate = v.CreatedAt,
                Status = v.Status.ToString()
            }).ToList();

            return new PagedResult<PendingVenueListItemResponse>
            {
                Page = result.Page,
                PageSize = result.PageSize,
                TotalItems = result.TotalItems,
                Items = items
            };
        }

        public async Task<PendingVenueDetailResponse> GetPendingVenueDetailAsync(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetVenueWithDocumentsAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            if (venue.Status != VenueStatus.Pending)
            {
                throw new BadRequestException("Cơ sở này không ở trạng thái chờ duyệt.");
            }

            var ownerProfile = await _identityService.GetUserProfileAsync(venue.OwnerId);
            if (ownerProfile == null)
            {
                throw new NotFoundException("Không tìm thấy thông tin chủ sân.");
            }

            var bankAccounts = await _unitOfWork.UserBankAccounts.FindAsync(b => b.UserId == venue.OwnerId);
            var bankAccount = bankAccounts.FirstOrDefault(); 
            string address = $"{venue.AddressDetail}, {venue.Ward?.Name}, {venue.Province?.Name}";

            return new PendingVenueDetailResponse
            {
                VenueId = venue.Id,
                VenueName = venue.Name,
                Address = address,
                Description = venue.Description ?? string.Empty,
                OpenTime = venue.OpenTime,
                CloseTime = venue.CloseTime,
                ThumbnailUrl = venue.ThumbnailUrl ?? string.Empty,
                OwnerName = ownerProfile.FullName ?? string.Empty,
                OwnerEmail = ownerProfile.Email ?? string.Empty,
                OwnerPhone = ownerProfile.PhoneNumber ?? string.Empty,
                OwnerBankName = bankAccount?.BankName ?? string.Empty,
                OwnerBankAccountNumber = bankAccount?.AccountNumber ?? string.Empty,
                OwnerAccountHolderName = bankAccount?.AccountHolderName ?? string.Empty,
                BusinessLicense = venue.Documents.FirstOrDefault(d => d.DocumentType == DocumentType.BusinessLicense) is VenueDocument bizDoc
                    ? new VenueDocumentResponse
                    {
                        IssueDate = bizDoc.IssueDate,
                        ExpiryDate = bizDoc.ExpiryDate,
                        Images = [.. bizDoc.Images.Select(i => i.ImageUrl)]
                    }
                    : null
            };
        }

        public async Task ApproveVenueAsync(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            if (venue.Status != VenueStatus.Pending)
            {
                throw new BadRequestException("Cơ sở không ở trạng thái chờ duyệt.");
            }

            venue.Status = VenueStatus.Active;
            venue.RejectionReason = null;
            _unitOfWork.Venues.Update(venue);
            
            await _unitOfWork.SaveChangesAsync();

            await _notificationService.NotifyVenueApprovedAsync(venue.OwnerId, venue.Id, venue.Name);
        }

        public async Task RejectVenueAsync(int venueId, RejectVenueRequest request)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            if (venue.Status != VenueStatus.Pending)
            {
                throw new BadRequestException("Cơ sở không ở trạng thái chờ duyệt.");
            }

            venue.Status = VenueStatus.Rejected;
            venue.RejectionReason = request.RejectionReason;
            _unitOfWork.Venues.Update(venue);

            await _unitOfWork.SaveChangesAsync();

            await _notificationService.NotifyVenueRejectedAsync(venue.OwnerId, venue.Id, venue.Name, request.RejectionReason);
        }
    }
}
