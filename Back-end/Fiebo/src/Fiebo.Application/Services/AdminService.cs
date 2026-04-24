using Fiebo.Application.DTOs.Admin;
using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _unitOfWork;
        public readonly IIdentityService _identityService;
        public AdminService(IUnitOfWork unitOfWork, IIdentityService identityService)
        {
            _unitOfWork = unitOfWork;
            _identityService = identityService;
        }
        public async Task<PagedResult<CustomerResponse>> GetCustomerListAsync(CustomerFilter filter)
        {
            if (filter.PageNumber <= 0) filter.PageNumber = 1;
            if (filter.PageSize <= 0) filter.PageSize = 10;

            var result = await _unitOfWork.Admins.GetCustomersWithFilterAsync(filter);

            return result;
        }

        public async Task<PagedResult<OwnerListResponse>> GetOwnerListAsync(OwnerListRequest request)
        {
            var owners = await _identityService.GetOwnersAsync(request.Page, request.PageSize, request.From, request.To);
            return owners;
        }

        public async Task<string> ResetFinanceAdminPasswordAsync(string userId)
        {
            var newPass = await _unitOfWork.Admins.ResetFinanceAdminPasswordAsync(userId);
            return newPass;
        }

        public async Task<OwnerDetailResponse> GetOwnerAsync(string ownerId)
        {
            var owner = await _identityService.GetUserProfileAsync(ownerId) ?? throw new NotFoundException("Owner not found");
            if(owner.Roles != AppRoles.FieldOwner)
            {
                throw new NotFoundException("Owner not found");
            }
            var subscription = await _unitOfWork.OwnerPlans.GetCurrentActiveByOwnerIdAsync(ownerId);
            var venues = await _unitOfWork.Venues.GetVenuesByOwnerAsync(ownerId);

            return new OwnerDetailResponse
            {
                Name = owner.FullName ?? "",
                Email = owner.Email ?? "",
                PhoneNumber = owner?.PhoneNumber ?? "",
                Status = owner?.Status?.ToString() ?? "",
                CreatedAt = owner?.CreatedAt,
                Subscription = subscription != null ? new SubscriptionInfoDto
                {
                    Id = subscription.Id,
                    CurrentPlan = subscription.Plan.Name,
                    StartDate = subscription.StartDate,
                    EndDate = subscription.EndDate,
                    SubscriptionStatus = subscription.Status.ToString() ?? "",
                } : null,
                Venues = [.. venues.Where(v => v.Status != VenueStatus.Draft).Select(v => new VenueInfoDto
                {
                    Id = v.Id,
                    VenueName = v.Name,
                    Province = v.Province?.Name ?? "",
                    Ward = v.Ward?.Name ?? "",
                    Status = v?.Status.ToString() ?? "",
                    AddressDetail = v?.AddressDetail ?? "",
                    NumberOfFields = v?.Fields?.Count() ?? 0,
                })]
            };
        }

        public async Task<VenueDetailResponse> GetVenueDetailAsync(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetVenueWithDocumentsAsync(venueId);
            if (venue == null)
            {
                throw new NotFoundException("Không tìm thấy cơ sở.");
            }

            var ownerProfile = await _identityService.GetUserProfileAsync(venue.OwnerId);
            if (ownerProfile == null)
            {
                throw new NotFoundException("Không tìm thấy thông tin chủ sân.");
            }

            var bankAccounts = await _unitOfWork.UserBankAccounts.FindAsync(b => b.UserId == venue.OwnerId);
            var bankAccount = bankAccounts.FirstOrDefault();
            string address = $"{venue.AddressDetail}, {venue.Ward?.Name}, {venue.Province?.Name}";

            return new VenueDetailResponse
            {
                VenueId = venue.Id,
                VenueName = venue.Name,
                Address = address,
                Description = venue.Description ?? string.Empty,
                OpenTime = venue.OpenTime,
                CloseTime = venue.CloseTime,
                VenueStatus = venue.Status.ToString(),
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
                        Images = [.. bizDoc.Images.Select(i => new DocumentImageDto
                        {
                            ImageId = i.Id,
                            ImageUrl = i.ImageUrl ?? string.Empty
                        })]
                    }
                    : null,
            };
        }

        public async Task UpdateVenueStatusAsync(int venueId)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId) ?? throw new NotFoundException("Venue not found");
            if(venue.Status == VenueStatus.Active || venue.Status == VenueStatus.Inactive)
            {
                venue.Status = VenueStatus.Locked;
                _unitOfWork.Venues.Update(venue);
                await _unitOfWork.SaveChangesAsync();
                return;
            }
            if(venue.Status == VenueStatus.Locked)
            {
                venue.Status = VenueStatus.Inactive;
                _unitOfWork.Venues.Update(venue);
                await _unitOfWork.SaveChangesAsync();
                return;
            }
        }
    }
}
