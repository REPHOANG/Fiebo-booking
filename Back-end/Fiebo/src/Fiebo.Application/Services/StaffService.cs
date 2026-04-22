using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.DTOs.Field;
using Fiebo.Application.DTOs.Owner;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;

namespace Fiebo.Application.Services
{
    public class StaffService : IStaffService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IIdentityService _identityService;

        public StaffService(IUnitOfWork unitOfWork, IIdentityService identityService)
        {
            _unitOfWork = unitOfWork;
            _identityService = identityService;
        }

        public async Task<List<OwnerStaffListResponse>> GetOwnerStaffListAsync(string ownerId)
        {
            var venues = await _unitOfWork.Venues.GetVenuesWithStaffAsync(ownerId);
            var response = new List<OwnerStaffListResponse>();

            foreach (var venue in venues)
            {
                var venueGroup = new OwnerStaffListResponse
                {
                    VenueId = venue.Id,
                    VenueName = venue.Name,
                    Staffs = []
                };

                foreach (var vs in venue.VenueStaffs)
                {
                    var userProfile = await _identityService.GetUserProfileAsync(vs.StaffId);
                    if (userProfile != null)
                    {
                        venueGroup.Staffs.Add(new OwnerStaffMemberDto
                        {
                            StaffId = vs.StaffId,
                            FullName = userProfile.FullName ?? "",
                            Username = userProfile.Email ?? "",
                            Status = userProfile.Status ?? "",
                            CreatedAt = DateTime.Now
                        });
                    }
                }
                response.Add(venueGroup);
            }
            return response;
        }

        public async Task<bool> CreateStaffAsync(string ownerId, OwnerCreateStaffRequest request)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(request.VenueId);
            if (venue == null || venue.OwnerId != ownerId)
                throw new BadRequestException("Sân bóng không hợp lệ hoặc không thuộc quyền quản lý của bạn.");

            var fakeEmail = $"{request.Username}@gmail.com";

            var createResult = await _identityService.CreateUserAsync(
                fakeEmail,
                null!,
                request.Password,
                request.FullName,
                AppRoles.FieldStaff,
                null
            );

            if (!createResult.IsSuccess)
                throw new BadRequestException(createResult.ErrorMessage);
            var active = await _identityService.ActivateUserAsync(fakeEmail);
            if (active == false)
                throw new BadRequestException("Kích hoạt tài khoản thất bại.");

            var venueStaff = new VenueStaff
            {
                VenueId = request.VenueId,
                StaffId = createResult.UserId
            };

            _unitOfWork.VenueStaffs.Add(venueStaff);
            return await _unitOfWork.SaveChangesAsync() > 0;
        }

        public async Task<bool> ChangeStaffStatusAsync(string ownerId, string staffId)
        {
            var isStaffOfOwner = await _unitOfWork.Venues.GetVenuesWithStaffAsync(ownerId);

            var staffExists = isStaffOfOwner.Any(v => v.VenueStaffs.Any(vs => vs.StaffId == staffId));

            if (!staffExists)
            {
                throw new BadRequestException("Nhân viên không thuộc quyền quản lý của bạn.");
            }
            var staff = await _identityService.GetUserProfileAsync(staffId);
            var result = false;
            if (staff!.Status == UserStatus.Active.ToString())
            {
                result = await _identityService.UpdateUserStatusAsync(staffId, UserStatus.Inactive);
                return result;
            }
            result = await _identityService.UpdateUserStatusAsync(staffId, UserStatus.Active);

            return result;
        }

        public async Task<List<OwnerVenueListResponse>> GetAssignedVenuesAsync(string? staffId)
        {
            if(staffId == null)
            {
                throw new UnauthorizedAccessException("Staff ID cannot be null.");
            }
            var staffVenues = await _unitOfWork.VenueStaffs.GetVenuesByStaffIdAsync(staffId);
            return [.. staffVenues.Select(v => new OwnerVenueListResponse
            {
                VenueId = v.Id,
                Name = v.Name,
                ThumbnailUrl = v?.ThumbnailUrl ?? "",
                Province = v.Province?.Name ?? "",
                Ward = v.Ward?.Name ?? "",
                Status = v.Status.ToString(),
                TotalFields = v.Fields.Count
            })];
        }

        public async Task<PagedResult<OwnerBookingListResponse>> GetStaffBookingsAsync(string? staffId, OwnerBookingHistoryFilter param)
        {
            var venueIds = (await _unitOfWork.VenueStaffs.FindAsync(vs => vs.StaffId == staffId)).Select(vs => vs.VenueId).ToList();
            var staffBookings = await _unitOfWork.Bookings.GetBookingsByStaffIdAsync(venueIds, param);
            return new PagedResult<OwnerBookingListResponse>
            {
                Page = staffBookings.Page,
                PageSize = staffBookings.PageSize,
                TotalItems = staffBookings.TotalItems,
                Items = [.. staffBookings.Items.Select(b => new OwnerBookingListResponse
                {
                    BookingId = b.Id,
                    CustomerName = b.Fullname,
                    PhoneNumber = b.PhoneNumber,
                    BookingDate = b.BookingDate,
                    VenueName = b.Venue.Name,
                    FieldNames = b.BookingDetails.Select(d => d.Field.Name).ToList(),
                    TotalPrice = b.TotalPrice,
                    Status = b.Status.ToString(),
                    CreatedAt = b.CreatedAt,
                })]
            };
        }
    }
}