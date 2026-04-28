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

        public async Task<List<VenueTimeSlotDto>> CreateVenueTimeSlotAsync(int venueId, List<CreateVenueTimeSlotRequest> requests, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập");
            }

            var venue = await _unitOfWork.Venues.GetByIdAsync(venueId) ?? throw new NotFoundException("Sân không tồn tại");
            if (venue.OwnerId != ownerId)
            {
                throw new ForbiddenException("Chủ sở hữu không khớp");
            }

            if (requests == null || requests.Count == 0)
            {
                throw new BadRequestException("Danh sách khung giờ không được để trống");
            }

            var normalizedRequests = new List<(CreateVenueTimeSlotRequest Request, DayOfWeek DayOfWeek)>(requests.Count);

            foreach (var request in requests)
            {
                if (request.StartTime >= request.EndTime)
                {
                    throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc");
                }

                if (request.StartTime < venue.OpenTime || request.EndTime > venue.CloseTime)
                {
                    throw new BadRequestException("Khung giờ nằm ngoài giờ mở/đóng của sân");
                }

                var duration = request.EndTime - request.StartTime;
                if (duration < TimeSpan.FromMinutes(30))
                {
                    throw new BadRequestException("Thời lượng khung giờ phải chẵn 30 phút");
                }

                if (request.StartTime.Minute % 30 != 0 || request.EndTime.Minute % 30 != 0)
                {
                    throw new BadRequestException("Thời gian bắt đầu và kết thúc phải chẵn 30 phút");
                }

                if (!Enum.TryParse<DayOfWeek>(request.DayOfWeek, true, out var dayOfWeek))
                {
                    throw new BadRequestException("Ngày trong tuần không hợp lệ");
                }
                
                var sportType = await _unitOfWork.SportTypes.GetByIdAsync(request.SportTypeId);
                if (sportType == null)
                {
                    throw new BadRequestException("Môn thể thao không hợp lệ");
                }

                normalizedRequests.Add((request, dayOfWeek));
            }

            // Check overlap inside request list (same SportType + DayOfWeek)
            foreach (var group in normalizedRequests.GroupBy(x => new { x.Request.SportTypeId, x.DayOfWeek }))
            {
                var ordered = group.OrderBy(x => x.Request.StartTime).ToList();
                for (var i = 1; i < ordered.Count; i++)
                {
                    if (ordered[i].Request.StartTime < ordered[i - 1].Request.EndTime)
                    {
                        throw new BadRequestException("Có khung giờ bị trùng trong danh sách gửi lên.");
                    }
                }
            }

            // Check overlap with existing slots in DB
            foreach (var item in normalizedRequests)
            {
                var overlap = await _unitOfWork.TimeSlots.IsTimeSlotOverlapping(
                    venueId,
                    item.Request.SportTypeId,
                    item.DayOfWeek,
                    item.Request.StartTime,
                    item.Request.EndTime,
                    null);

                if (overlap)
                {
                    throw new BadRequestException("Khung giờ bị trùng với khung giờ đã tồn tại");
                }
            }

            var newSlots = new List<TimeSlot>(normalizedRequests.Count);
            foreach (var item in normalizedRequests)
            {
                var slot = new TimeSlot
                {
                    VenueId = venueId,
                    SportTypeId = item.Request.SportTypeId,
                    DayOfWeek = item.DayOfWeek,
                    StartTime = item.Request.StartTime,
                    EndTime = item.Request.EndTime,
                    Price = item.Request.Price
                };

                _unitOfWork.TimeSlots.Add(slot);
                newSlots.Add(slot);
            }

            await _unitOfWork.SaveChangesAsync();

            return [.. newSlots.Select(s => new VenueTimeSlotDto
            {
                Id = s.Id,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Price = s.Price,
                DayOfWeek = s.DayOfWeek.ToString()
            })];
        }

        public async Task<VenueTimeSlotDto> UpdateVenueTimeSlotAsync(int timeSlotId, UpdateVenueTimeSlotRequest request, string? ownerId)
        {
            if (ownerId == null)
            {
                throw new UnauthorizedException("Bạn cần đăng nhập");
            }

            var timeSlot = await _unitOfWork.TimeSlots.GetByIdAsync(timeSlotId) ?? throw new BadRequestException("Slot không tồn tại");
            var venue = await _unitOfWork.Venues.GetByIdAsync(timeSlot.VenueId) ?? throw new NotFoundException("Sân không tồn tại");
            if (venue.OwnerId != ownerId)
            {
                throw new ForbiddenException("Chủ sở hữu không khớp");
            }
            var canEdit = await _unitOfWork.TimeSlots.CanBeEditedOrDeleted(timeSlotId);
            if (!canEdit)
            {
                throw new BadRequestException("Khung giờ này đã có đặt sân trong tương lai, không thể chỉnh sửa.");
            }
            if (request.StartTime >= request.EndTime)
            {
                throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc");
            }
            if (request.StartTime < venue.OpenTime || request.EndTime > venue.CloseTime)
            {
                throw new BadRequestException("Khung giờ nằm ngoài giờ mở/đóng của sân");
            }
            if (timeSlot.IsDeleted)
            {
                throw new BadRequestException("Slot này đã bị xoá");
            }
            var duration = request.EndTime - request.StartTime;

            if (duration < TimeSpan.FromMinutes(30))
            {
                throw new BadRequestException("Thời lượng khung giờ phải chẵn 30 phút");
            }
            if (request.StartTime.Minute % 30 != 0 || request.EndTime.Minute % 30 != 0)
            {
                throw new BadRequestException("Thời gian bắt đầu và kết thúc phải chẵn 30 phút");
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
                throw new BadRequestException("Khung giờ bị trùng với khung giờ đã tồn tại");
            }
            var isUsed = await _unitOfWork.BookingDetails.FindAsync(bd => bd.SlotId == timeSlotId);
            if (isUsed.ToList().Count == 0)
            {
                timeSlot.StartTime = request.StartTime;
                timeSlot.EndTime = request.EndTime;
                timeSlot.Price = request.Price;
                _unitOfWork.TimeSlots.Update(timeSlot);
                await _unitOfWork.SaveChangesAsync();
                return new VenueTimeSlotDto
                {
                    Id = timeSlot.Id,
                    StartTime = timeSlot.StartTime,
                    EndTime = timeSlot.EndTime,
                    Price = timeSlot.Price,
                    DayOfWeek = timeSlot.DayOfWeek.ToString()
                };
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
            var isUsed = await _unitOfWork.BookingDetails.FindAsync(bd => bd.SlotId == timeSlotId);
            if (isUsed.ToList().Count == 0)
            {
                _unitOfWork.TimeSlots.Remove(timeSlot);
                await _unitOfWork.SaveChangesAsync();
                return;
            }
            var canEdit = await _unitOfWork.TimeSlots.CanBeEditedOrDeleted(timeSlotId);
            if (!canEdit)
            {
                throw new BadRequestException("Khung giờ này đã có đặt sân, không thể xoá");
            }
            if(timeSlot.IsDeleted)
            {
                throw new BadRequestException("Khung giờ này đã bị xóa.");
            }
            timeSlot.IsDeleted = true;
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
