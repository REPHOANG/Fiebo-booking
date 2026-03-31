using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class EventService : IEventService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<EventService> _logger;
        private readonly ICacheService _cacheService;
        private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(5);
        public EventService(IUnitOfWork unitOfWork, ILogger<EventService> logger, ICacheService cacheService)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _cacheService = cacheService;
        }

        public async Task<int> CreateDropInEventAsync(CreateDropInEventRequest request, string userId)
        {
            if (request.Details.Count == 0)
                throw new BadRequestException("Phải chọn ít nhất một sân và khung giờ.");

            // BR-33: MinPlayer > 0, MaxPlayer >= MinPlayer
            if (request.MinPlayer <= 0)
                throw new BadRequestException("Số người tối thiểu phải lớn hơn 0.");

            if (request.MaxPlayer < request.MinPlayer)
                throw new BadRequestException("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu.");

            // Verify all fields exist and belong to a venue owned by this user
            int? venueId = null;
            foreach (var detail in request.Details)
            {
                var field = await _unitOfWork.Fields.GetByIdAsync(detail.FieldId);
                if (field == null)
                    throw new NotFoundException($"Không tìm thấy sân với ID {detail.FieldId}.");
                if (field.Status != FieldStatus.Active)
                    throw new BadRequestException("Sân hiện tại không hoạt động.");

                var venue = await _unitOfWork.Venues.GetByIdAsync(field.VenueId);
                if (venue == null || venue.OwnerId != userId)
                    throw new UnauthorizedAccessException("Bạn không có quyền tạo sự kiện cho sân này.");
                if (venue.Status != VenueStatus.Active)
                    throw new BadRequestException("Cơ sở này hiện không hoạt động.");

                if (venueId == null)
                    venueId = venue.Id;
                else if (venueId != venue.Id)
                    throw new BadRequestException("Tất cả sân phải thuộc cùng một cơ sở.");

                var slot = await _unitOfWork.TimeSlots.GetByIdAsync(detail.SlotId);
                if (slot == null)
                    throw new NotFoundException($"Không tìm thấy khung giờ với ID {detail.SlotId}.");
            }

            // BR-34: Check slot availability (no booking or event overlap)
            foreach (var detail in request.Details)
            {
                var bookingAvailable = await _unitOfWork.BookingDetails
                    .IsSlotAvailable(detail.SlotId, detail.FieldId, request.EventDate);

                if (!bookingAvailable)
                    throw new ResourceConflictException(
                        $"Sân và khung giờ (FieldId={detail.FieldId}, SlotId={detail.SlotId}) đã được đặt cho ngày {request.EventDate}.");

                var eventUsed = await _unitOfWork.TicketEvents
                    .IsSlotUsedByEventAsync(detail.FieldId, detail.SlotId, request.EventDate);

                if (eventUsed)
                    throw new ResourceConflictException(
                        $"Sân và khung giờ (FieldId={detail.FieldId}, SlotId={detail.SlotId}) đã có sự kiện khác vào ngày {request.EventDate}.");
            }

            var ticketEvent = new TicketEvent
            {
                EventDate = request.EventDate,
                PricePerPerson = request.PricePerPerson,
                MinPlayer = request.MinPlayer,
                MaxPlayer = request.MaxPlayer,
                Description = request.Description,
                OwnerId = userId,
                Status = TicketEventStatus.Pending
            };

            _unitOfWork.TicketEvents.Add(ticketEvent);

            foreach (var detail in request.Details)
            {
                ticketEvent.Details.Add(new TicketEventDetail
                {
                    FieldId = detail.FieldId,
                    SlotId = detail.SlotId,
                    Event = ticketEvent
                });
            }

            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation(
                "Drop-in event {EventId} created by {UserId} on {EventDate} with {DetailCount} slot(s)",
                ticketEvent.Id, userId, request.EventDate, request.Details.Count);

            return ticketEvent.Id;
        }

        public async Task<List<DropInEventListItemResponse>> GetDropInEventListAsync()
        {
            var events = await _unitOfWork.TicketEvents.GetPendingEventsAsync();

            return events.Select(e =>
            {
                var firstDetail = e.Details.FirstOrDefault();
                var currentPlayer = e.Participants
                    .Sum(p => p.TicketQuantity);

                return new DropInEventListItemResponse
                {
                    EventId = e.Id,
                    VenueName = firstDetail?.Field.Venue?.Name ?? "",
                    EventDate = e.EventDate,
                    TicketPrice = e.PricePerPerson,
                    RemainingTicketQuantity = e.MaxPlayer - currentPlayer,
                    Slots = e.Details
                        .Select(d => new TicketEventSlotResponse
                        {
                            FieldName = d.Field.Name,
                            StartTime = d.Slot.StartTime,
                            EndTime = d.Slot.EndTime
                        })
                        .OrderBy(s => s.StartTime)
                        .ToList()
                };
            }).ToList();
        }

        /// <summary>
        /// Get drop-in event detail by event id
        /// </summary>
        /// <param name="eventId"></param>
        /// <returns></returns>
        /// <exception cref="NotFoundException"></exception>
        public async Task<TicketEventDetailResponse> GetDropInEventDetailAsync(int eventId)
        {
            var eventDetail = await _unitOfWork.TicketEvents.GetDropInEventDetailAsync(eventId);
            if (eventDetail == null)
            {
                throw new NotFoundException("Sự kiện này không tồn tại");
            }
            var firstDetail = eventDetail.Details.First();
            var address = $"{firstDetail.Field.Venue?.AddressDetail}, {firstDetail.Field.Venue?.Ward?.Name}, {firstDetail.Field.Venue?.Province?.Name}"; var remainingTicketQuantity = eventDetail.MaxPlayer - (await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId));

            var slots = eventDetail.Details
                .Select(d => new TicketEventSlotResponse
                {
                    FieldName = d.Field.Name,
                    StartTime = d.Slot.StartTime,
                    EndTime = d.Slot.EndTime
                })
                .OrderBy(s => s.StartTime)
                .ToList();

            return new TicketEventDetailResponse
            {
                EventId = eventDetail.Id,
                VenueName = firstDetail.Field.Venue?.Name ?? "",
                VenueAddress = address,
                EventDate = eventDetail.EventDate,
                Description = eventDetail.Description,
                TicketPrice = eventDetail.PricePerPerson,
                TicketQuantity = eventDetail.MaxPlayer,
                RemainingTicketQuantity = remainingTicketQuantity,
                Slots = slots
            };
        }

        public async Task<TicketDetailResponse> GetTicketDetailAsync(int ticketId, string userId)
        {
            var participant = await _unitOfWork.TicketParticipants.GetTicketDetailAsync(ticketId);
            if (participant == null)
            {
                throw new NotFoundException("Không có dữ liệu hợp lệ.");
            }
            if (participant.UserId != userId)
            {
                throw new BadRequestException("Bạn không có quyền xem vé này");
            }
            var slots = participant.Event.Details
                .Select(d => new TicketEventSlotResponse
                {
                    FieldName = d.Field.Name,
                    StartTime = d.Slot.StartTime,
                    EndTime = d.Slot.EndTime
                })
                .OrderBy(s => s.StartTime)
                .ToList();

            return new TicketDetailResponse
            {
                ParticipantId = participant.Id,
                Fullname = participant.Fullname,
                PhoneNumber = participant.PhoneNumber,
                EventDate = participant.Event.EventDate,
                TicketQuantity = participant.TicketQuantity,
                PricePerTicket = participant.PricePerTicket,
                TotalAmount = participant.TotalPrice,
                Status = participant.Status.ToString(),
                ExpiredAt = participant.ExpiredAt,
                Slots = slots
            };
        }

        /// <summary>
        /// Join a drop-in event
        /// </summary>
        /// <param name="request"></param>
        /// <param name="eventId"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        /// <exception cref="NotFoundException"></exception>
        /// <exception cref="BadRequestException"></exception>
        public async Task<int> JoinDropInEventAsync(JoinEventRequest request, int eventId, string userId)
        {
            var lockKey = $"event:lock:{eventId}";
            string? lockValue = null;

            try
            {
                // 1. Acquire lock
                lockValue = await _cacheService.AcquireLockAsync(lockKey, LockExpiry);

                if (lockValue is null)
                {
                    _logger.LogWarning("Failed to acquire lock for event {EventId}", eventId);
                    throw new ResourceConflictException("Sự kiện đang được xử lý, vui lòng thử lại.");
                }

                // 2. Get event
                var dropInEvent = await _unitOfWork.TicketEvents.GetDropInEventDetailAsync(eventId);
                if (dropInEvent == null)
                {
                    throw new NotFoundException("Sự kiện này không tồn tại");
                }

                // Check Venue and Field active status
                var firstDetail = dropInEvent.Details.FirstOrDefault();
                if (firstDetail != null)
                {
                    if (firstDetail.Field.Status != FieldStatus.Active)
                        throw new BadRequestException("Sân hiện tại không hoạt động.");
                    if (firstDetail.Field.Venue?.Status != VenueStatus.Active)
                        throw new BadRequestException("Cơ sở này hiện không hoạt động.");
                }

                if (dropInEvent.Status != TicketEventStatus.Pending)
                {
                    throw new BadRequestException("Sự kiện này hiện tại không có sẵn");
                }

                // 3. Check slot capacity (fix bug quantity)
                var currentPlayer = await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId);

                if (currentPlayer + request.TicketQuantity > dropInEvent.MaxPlayer)
                {
                    throw new BadRequestException("Số lượng người tham gia sự kiện đã đầy");
                }

                // 4. Create participant
                var participant = new TicketParticipant
                {
                    EventId = eventId,
                    UserId = userId,
                    Fullname = request.Fullname,
                    PhoneNumber = request.PhoneNumber,
                    TicketQuantity = request.TicketQuantity,
                    PricePerTicket = dropInEvent.PricePerPerson,
                    TotalPrice = request.TicketQuantity * dropInEvent.PricePerPerson,
                    Status = TicketParticipantStatus.Pending,
                    ExpiredAt = DateTime.Now.AddMinutes(5)
                };

                _unitOfWork.TicketParticipants.Add(participant);
                await _unitOfWork.SaveChangesAsync();

                return participant.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Error while joining drop-in event with id {EventId} for user {UserId}",
                    eventId, userId);
                throw;
            }
            finally
            {
                // 5. Release lock
                if (lockValue != null)
                {
                    await _cacheService.ReleaseLockAsync(lockKey, lockValue);
                }
            }
        }

        public async Task MakeDropInPayment(int ticketId, string userId)
        {
            var participant = await _unitOfWork.TicketParticipants.GetByIdAsync(ticketId);
            if (participant == null)
            {
                throw new NotFoundException("Không có dữ liệu hợp lệ.");
            }
            if (participant.UserId != userId)
            {
                throw new BadRequestException("Bạn không có quyền thanh toán vé này");
            }
            if (participant.Status != TicketParticipantStatus.Pending)
            {
                throw new BadRequestException("Vé không hợp lệ để thanh toán");
            }
            var wallet = await _unitOfWork.Wallets.GetByUserId(userId);
            if (wallet == null)
            {
                throw new NotFoundException("Không tìm thấy ví.");
            }
            if (wallet.Balance < participant.TotalPrice)
            {
                throw new BadRequestException("Số dư trong ví không đủ để thanh toán");
            }
            await _unitOfWork.BeginTransactionAsync();
            try
            {

                wallet.Balance -= participant.TotalPrice;
                participant.Status = TicketParticipantStatus.Joined;
                participant.ExpiredAt = null;
                _unitOfWork.Wallets.Update(wallet);
                _unitOfWork.TicketParticipants.Update(participant);
                _unitOfWork.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = wallet.Id,
                    TransactionType = TransactionType.EventBooking,
                    Direction = TransactionDirection.Debit,
                    Amount = participant.TotalPrice,
                    ReferenceId = participant.EventId
                });
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackTransactionAsync();
                _logger.LogError(ex, "Error while processing payment for ticket {TicketId} by user {UserId}", ticketId, userId);
                throw new BadRequestException("Không thể xử lý thanh toán. Vui lòng thử lại.");
            }
        }

        public async Task<OwnerTicketEventDetailResponse?> GetEventDetailForOwnerAsync(int eventId, string ownerId)
        {
            var ticketEvent = await _unitOfWork.TicketEvents.GetEventDetailForOwnerAsync(eventId, ownerId);

            if (ticketEvent == null) return null;

            // Logic kiểm tra: Nếu mảng Participants có bất kỳ ai thì không cho sửa
            bool hasParticipants = ticketEvent.Participants.Any(p => p.Status != TicketParticipantStatus.Cancelled);

            return new OwnerTicketEventDetailResponse
            {
                Id = ticketEvent.Id,
                Description = ticketEvent.Description,
                EventDate = ticketEvent.EventDate,
                MinPlayer = ticketEvent.MinPlayer,
                MaxPlayer = ticketEvent.MaxPlayer,
                PricePerPerson = ticketEvent.PricePerPerson,
                Status = ticketEvent.Status.ToString(),

                // Nút Edit sẽ ẩn nếu IsEditable = false
                IsEditable = !hasParticipants,

                Slots = ticketEvent.Details.Select(d => new EventSlotResponse
                {
                    FieldName = d.Field.Name,
                    StartTime = d.Slot.StartTime,
                    EndTime = d.Slot.EndTime
                }).ToList(),

                Participants = ticketEvent.Participants.Select(p => new ParticipantResponse
                {
                    Fullname = p.Fullname,
                    PhoneNumber = p.PhoneNumber,
                    TicketQuantity = p.TicketQuantity,
                    Status = p.Status.ToString(),
                    JoinedAt = p.JoinedAt
                }).ToList()
            };
        }

        public async Task UpdateDropInEventAsync(int eventId, UpdateDropInEventRequest request, string ownerId)
        {
            var ticketEvent = await _unitOfWork.TicketEvents.GetEventDetailForOwnerAsync(eventId, ownerId);

            if (ticketEvent == null)
            {
                throw new Exception("Sự kiện không tồn tại hoặc bạn không có quyền.");
            }

            if (ticketEvent.Participants.Any(p => p.Status != TicketParticipantStatus.Cancelled))
            {
                throw new Exception("Không thể chỉnh sửa vì đã có người chơi đăng ký tham gia.");
            }

            ticketEvent.Description = request.Description;
            ticketEvent.MinPlayer = request.MinPlayer;
            ticketEvent.MaxPlayer = request.MaxPlayer;
            ticketEvent.PricePerPerson = request.PricePerPerson;

            _unitOfWork.TicketEvents.Update(ticketEvent);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UpdateDropInEventAsync(int eventId, UpdateEventRequest request, string ownerId)
        {
            var dropInEvent = await _unitOfWork.TicketEvents.GetByIdAsync(eventId);
            if (dropInEvent == null)
            {
                throw new NotFoundException("Sự kiện này không tồn tại");
            }
            var earliestSlot = await _unitOfWork.TicketEventsDetails.GetEarliestDetailAsync(eventId);
            if (earliestSlot == null)
            {
                throw new BadRequestException("Sự kiện không có slot");
            }
            if (dropInEvent.OwnerId != ownerId)
            {
                throw new BadRequestException("Bạn không có quyền chỉnh sửa sự kiện này");
            }
            if (dropInEvent.Status != TicketEventStatus.Pending)
            {
                throw new BadRequestException("Chỉ sự kiện với trạng thái đang chờ mới có thể sửa");
            }
            var currentPlayer = await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId);
            if (currentPlayer > 0)
            {
                throw new BadRequestException("Không thể chỉnh sửa sự kiện khi đã có người đăng kí");
            }

            dropInEvent.PricePerPerson = request.PricePerPerson;
            dropInEvent.MinPlayer = request.MinPlayer;
            dropInEvent.MaxPlayer = request.MaxPlayer;
            dropInEvent.Description = request.Description;
            await _unitOfWork.SaveChangesAsync();
        }
        public async Task<List<OwnerDropInEventListItemResponse>> GetOwnerEventListAsync(string ownerId)
        {
            var events = await _unitOfWork.TicketEvents.GetOwnerEventListAsync(ownerId);

            return events.Select(e =>
            {
                var firstDetail = e.Details.FirstOrDefault();
                var currentPlayer = e.Participants.Sum(p => p.TicketQuantity);

                return new OwnerDropInEventListItemResponse
                {
                    EventId = e.Id,
                    VenueName = firstDetail?.Field.Venue?.Name ?? "",
                    EventDate = e.EventDate,
                    TicketPrice = e.PricePerPerson,
                    TotalTicketQuantity = e.MaxPlayer,
                    RemainingTicketQuantity = e.MaxPlayer - currentPlayer,
                    Status = e.Status.ToString(),
                    CreatedAt = e.CreatedAt,
                    Slots = e.Details
                        .Select(d => new TicketEventSlotResponse
                        {
                            FieldName = d.Field.Name,
                            StartTime = d.Slot.StartTime,
                            EndTime = d.Slot.EndTime
                        })
                        .OrderBy(s => s.StartTime)
                        .ToList()
                };
            }).ToList();
        }

        public async Task<PagedResult<CustomerEventHistoryResponse>> GetCustomerEventHistoryAsync(string userId, EventHistoryFilter filter)
        {
            var (items, totalRecords) = await _unitOfWork.TicketParticipants.GetCustomerEventHistoryAsync(
                userId,
                filter.PageIndex,
                filter.PageSize);

            var mappedItems = items.Select(tp =>
            {
                var firstDetail = tp.Event.Details.FirstOrDefault();

                return new CustomerEventHistoryResponse
                {
                    TicketParticipantId = tp.Id,
                    EventId = tp.EventId,
                    VenueName = firstDetail?.Field.Venue?.Name ?? "",
                    EventDate = tp.Event.EventDate,
                    TicketQuantity = tp.TicketQuantity,
                    TotalAmount = tp.TotalPrice,
                    ParticipantStatus = tp.Status.ToString(),
                    Slots = tp.Event.Details
                        .Select(d => new TicketEventSlotResponse
                        {
                            FieldName = d.Field.Name,
                            StartTime = d.Slot.StartTime,
                            EndTime = d.Slot.EndTime
                        })
                        .OrderBy(s => s.StartTime)
                        .ToList()
                };
            }).ToList();

            return new PagedResult<CustomerEventHistoryResponse>
            {
                Items = mappedItems,
                TotalItems = totalRecords,
                Page = filter.PageIndex,   
                PageSize = filter.PageSize
            };
        }
    }
}