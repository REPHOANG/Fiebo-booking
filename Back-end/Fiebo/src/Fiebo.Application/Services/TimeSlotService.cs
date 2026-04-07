using Fiebo.Application.DTOs.Venue;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class TimeSlotService : ITimeSlotService
    {
        private readonly IUnitOfWork _unitOfWork;
        public TimeSlotService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        public async Task<VenueTimeSlotResponse> GetVenueTimeSlotAsync(int venueId, int sportTypeId, string? userId)
        {
            if (userId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để xem khung giờ sân");
            }
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId) ?? throw new NotFoundException("Không tìm thấy cơ sở");
            if (venue.OwnerId != userId)
            {
                throw new UnauthorizedException("Bạn không có quyền xem khung giờ sân này");
            }
            var result = await _unitOfWork.TimeSlots.GetVenueTimeSlotAsync(venueId, sportTypeId);
            return new VenueTimeSlotResponse
            {
                OpenTime = venue.OpenTime,
                CloseTime = venue.CloseTime,
                TimeSlots = [.. result.Select(ts => new VenueTimeSlotDto
                {
                    Id = ts.Id,
                    StartTime = ts.StartTime,
                    EndTime = ts.EndTime,
                    Price = ts.Price,
                    DayOfWeek = ts.DayOfWeek.ToString()
                })]
            };
        }

        public async Task<VenueTimeSlotDto> CreateVenueTimeSlotAsync(int venueId, CreateVenueTimeSlotRequest request, string? ownerId)
        {
            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId) ?? throw new NotFoundException("Không tìm thấy cơ sở");
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền thêm khung giờ cho sân này");
            }
            if (request.StartTime >= request.EndTime)
            {
                throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc");
            }
            if (request.StartTime < venue.OpenTime || request.EndTime > venue.CloseTime)
            {
                throw new BadRequestException("Khung giờ phải nằm trong thời gian mở cửa");
            }
            var duration = request.EndTime - request.StartTime;

            if (duration < TimeSpan.FromMinutes(30))
            {
                throw new BadRequestException("Khung giờ tối thiểu là 30 phút");
            }
            if (request.StartTime.Minute % 30 != 0 || request.EndTime.Minute % 30 != 0)
            {
                throw new BadRequestException("Thời gian phải theo mốc 30 phút");
            }
            if (!Enum.TryParse<DayOfWeek>(request.DayOfWeek, true, out var dayOfWeek))
            {
                throw new Exception("DayOfWeek không hợp lệ");
            }
            var overlap = await _unitOfWork.TimeSlots.IsTimeSlotOverlapping(venueId, request.SportTypeId, dayOfWeek, request.StartTime, request.EndTime);
            if (overlap)
            {
                throw new BadRequestException("Khung giờ này đang bị trùng với khung giờ hiện có. Vui lòng chọn khung giờ khác.");
            }

            var newSlot = new TimeSlot
            {
                VenueId = venueId,
                SportTypeId = request.SportTypeId,
                DayOfWeek = dayOfWeek,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Price = request.Price
            };
            _unitOfWork.TimeSlots.Add(newSlot);
            await _unitOfWork.SaveChangesAsync();
            return new VenueTimeSlotDto
            {
                Id = newSlot.Id,
                StartTime = newSlot.StartTime,
                EndTime = newSlot.EndTime,
                Price = newSlot.Price,
                DayOfWeek = dayOfWeek.ToString()
            };
        }

        public async Task<VenueTimeSlotDto> UpdateVenueTimeSlotAsync(int timeSlotId, UpdateVenueTimeSlotRequest request, string? ownerId)
        {
            var timeSlot = await _unitOfWork.TimeSlots.GetByIdAsync(timeSlotId) ?? throw new NotFoundException("Không tìm thấy khung giờ");
            var venue = await _unitOfWork.Venues.GetByIdAsync(timeSlot.VenueId) ?? throw new NotFoundException("Không tìm thấy cơ sở");
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền chỉnh sửa khung giờ cho sân này");
            }
            var canEdit = await _unitOfWork.TimeSlots.CanBeEditedOrDeleted(timeSlotId);
            if (!canEdit)
            {
                throw new BadRequestException("Khung giờ này đã có đặt sân, không thể chỉnh sửa. Vui lòng xóa khung giờ này và tạo khung giờ mới.");
            }
            if (request.StartTime >= request.EndTime)
            {
                throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc");
            }
            if (request.StartTime < venue.OpenTime || request.EndTime > venue.CloseTime)
            {
                throw new BadRequestException("Khung giờ phải nằm trong thời gian mở cửa");
            }
            if (timeSlot.IsDeleted)
            {
                throw new BadRequestException("Khung giờ này đã bị xóa. Vui lòng tạo khung giờ mới.");
            }
            var duration = request.EndTime - request.StartTime;

            if (duration < TimeSpan.FromMinutes(30))
            {
                throw new BadRequestException("Khung giờ tối thiểu là 30 phút");
            }
            if (request.StartTime.Minute % 30 != 0 || request.EndTime.Minute % 30 != 0)
            {
                throw new BadRequestException("Thời gian phải theo mốc 30 phút");
            }
            if (request.StartTime == timeSlot.StartTime &&
                request.EndTime == timeSlot.EndTime &&
                request.Price == timeSlot.Price)
            {
                return new VenueTimeSlotDto
                {
                    Id = timeSlot.Id,
                    StartTime = timeSlot.StartTime,
                    EndTime = timeSlot.EndTime,
                    Price = timeSlot.Price,
                    DayOfWeek = timeSlot.DayOfWeek.ToString()
                };
            }

            var overlap = await _unitOfWork.TimeSlots.IsTimeSlotOverlapping(venue.Id, timeSlot.SportTypeId, timeSlot.DayOfWeek, request.StartTime, request.EndTime, timeSlotId);
            if (overlap)
            {
                throw new BadRequestException("Khung giờ này đang bị trùng với khung giờ hiện có.");
            }
            timeSlot.IsDeleted = true;
            var newSlot = new TimeSlot
            {
                VenueId = venue.Id,
                SportTypeId = timeSlot.SportTypeId,
                DayOfWeek = timeSlot.DayOfWeek,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Price = request.Price
            };
            _unitOfWork.TimeSlots.Add(newSlot);
            await _unitOfWork.SaveChangesAsync();
            return new VenueTimeSlotDto
            {
                Id = newSlot.Id,
                StartTime = newSlot.StartTime,
                EndTime = newSlot.EndTime,
                Price = newSlot.Price,
                DayOfWeek = timeSlot.DayOfWeek.ToString()
            };
        }

        public async Task DeleteVenueTimeSlotAsync(int timeSlotId, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập để xem khung giờ sân");
            }
            var timeSlot = await _unitOfWork.TimeSlots.GetByIdAsync(timeSlotId) ?? throw new NotFoundException("Không tìm thấy khung giờ");
            var venue = await _unitOfWork.Venues.GetByIdAsync(timeSlot.VenueId) ?? throw new NotFoundException("Không tìm thấy cơ sở");
            if (venue.OwnerId != ownerId)
            {
                throw new UnauthorizedException("Bạn không có quyền xem khung giờ sân này");
            }
            var canEdit = await _unitOfWork.TimeSlots.CanBeEditedOrDeleted(timeSlotId);
            if (!canEdit)
            {
                throw new BadRequestException("Khung giờ này đã có đặt sân, không thể chỉnh sửa. Vui lòng xóa khung giờ này và tạo khung giờ mới.");
            }
            timeSlot.IsDeleted = true;
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
