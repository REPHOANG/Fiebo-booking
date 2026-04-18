using Fiebo.Application.DTOs.Event;
using Fiebo.Application.DTOs.TicketEvent;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using Fiebo.Domain.Shared;
using Microsoft.Extensions.Logging;
using Fiebo.Application.Validators;
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
        private readonly INotificationService _notificationService;
        private readonly IIdentityService _identityService;
        private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(5);
        public EventService(
            IUnitOfWork unitOfWork,
            ILogger<EventService> logger,
            ICacheService cacheService,
            INotificationService notificationService,
            IIdentityService identityService)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _cacheService = cacheService;
            _notificationService = notificationService;
            _identityService = identityService;
        }

        public async Task<int> CreateDropInEventAsync(CreateDropInEventRequest request, string userId)
        {
            if (request.Details.Count == 0)
                throw new BadRequestException("Phải chọn ít nhất một sân và khung giờ.");

            var duplicates = request.Details
                .GroupBy(x => new { x.FieldId, x.SlotId })
                .Where(g => g.Count() > 1);

            if (duplicates.Any())
                throw new BadRequestException("Danh sách sân và khung giờ bị trùng lặp.");

            // BR-33: MinPlayer > 0, MaxPlayer >= MinPlayer
            if (request.MinPlayer <= 0)
                throw new BadRequestException("Số người tối thiểu phải lớn hơn 0.");

            if (request.MaxPlayer < request.MinPlayer)
                throw new BadRequestException("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu.");

            var now = DateTime.Now;
            var maxEventDate = BookingDateValidator.GetMaxDate(now);

            if (request.EventDate < DateOnly.FromDateTime(now))
                throw new BadRequestException("Ngày tổ chức không hợp lệ.");

            if (request.EventDate > maxEventDate)
                throw new BadRequestException($"Chỉ có thể tạo sự kiện đến hết ngày {maxEventDate:dd/MM/yyyy}.");

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
                    throw new ForbiddenException("Bạn không có quyền tạo sự kiện cho sân này.");
                if (venue.Status != VenueStatus.Active)
                    throw new BadRequestException("Cơ sở này hiện không hoạt động.");

                if (venueId == null)
                    venueId = venue.Id;
                else if (venueId != venue.Id)
                    throw new BadRequestException("Tất cả sân phải thuộc cùng một cơ sở.");

                var slot = await _unitOfWork.TimeSlots.GetByIdAsync(detail.SlotId);
                if (slot == null)
                    throw new NotFoundException($"Không tìm thấy khung giờ với ID {detail.SlotId}.");
                if (slot.IsDeleted == true)
                {
                    throw new BadRequestException($"Khung giờ đã bị xóa.");
                }
                if (slot.VenueId != venue.Id)
                    throw new BadRequestException($"Khung giờ (SlotId={detail.SlotId}) không thuộc cùng cơ sở với sân (FieldId={detail.FieldId}).");
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
                Name = request.Name,
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
                    Name = e.Name,
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
        public async Task<List<DropInEventListItemResponse>> GetEventsByVenueIdAsync(int venueId)
        {
            var events = await _unitOfWork.TicketEvents.GetEventsByVenueIdAsync(venueId);

            return events.Select(e =>
            {
                var currentPlayer = e.Participants.Sum(p => p.TicketQuantity);

                return new DropInEventListItemResponse
                {
                    EventId = e.Id,
                    Name = e.Name,
                    VenueName = e.Details.FirstOrDefault()?.Field.Venue?.Name ?? "",
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
            if (eventDetail.Status != TicketEventStatus.Pending)
            {
                throw new BadRequestException("Sự kiện này hiện tại không có sẵn");
            }
            var firstDetail = eventDetail.Details.First();
            var venue = firstDetail.Field.Venue;
            if (venue == null || venue.Status != VenueStatus.Active)
                throw new BadRequestException("Cơ sở hiện không hoạt động");
            foreach (var d in eventDetail.Details)
            {
                if (d.Field == null || d.Field.Status != FieldStatus.Active)
                    throw new BadRequestException("Sân trong sự kiện không còn hoạt động");

                if (d.Slot == null || d.Slot.IsDeleted)
                    throw new BadRequestException("Slot trong sự kiện không còn hợp lệ");
            }

            var address = $"{firstDetail.Field.Venue?.AddressDetail}, {firstDetail.Field.Venue?.Ward?.Name}, {firstDetail.Field.Venue?.Province?.Name}";
            var remainingTicketQuantity = eventDetail.MaxPlayer - (await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId));

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
                Name = eventDetail.Name,
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
                EventName = participant.Event.Name,
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
            bool isEditable = !hasParticipants && ticketEvent.Status == TicketEventStatus.Pending;
            return new OwnerTicketEventDetailResponse
            {
                Id = ticketEvent.Id,
                Name = ticketEvent.Name,
                Description = ticketEvent.Description,
                EventDate = ticketEvent.EventDate,
                MinPlayer = ticketEvent.MinPlayer,
                MaxPlayer = ticketEvent.MaxPlayer,
                PricePerPerson = ticketEvent.PricePerPerson,
                Status = ticketEvent.Status.ToString(),

                // Nút Edit sẽ ẩn nếu IsEditable = false
                IsEditable = isEditable,

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
            if (request.MaxPlayer < request.MinPlayer)
            {
                throw new BadRequestException("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu");
            }

            dropInEvent.Name = request.Name;
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
                    Name = e.Name,
                    VenueName = firstDetail?.Field.Venue?.Name ?? "",
                    EventDate = e.EventDate,
                    TotalTicketQuantity = e.MaxPlayer,
                    RemainingTicketQuantity = e.MaxPlayer - currentPlayer,
                    Status = e.Status.ToString(),
                    CreatedAt = e.CreatedAt,
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
                    Name = tp.Event.Name,
                    VenueName = firstDetail?.Field.Venue?.Name ?? "",
                    ThumbnailUrl = firstDetail?.Field.Venue?.ThumbnailUrl,
                    EventDate = tp.Event.EventDate,
                    TicketQuantity = tp.TicketQuantity,
                    TotalAmount = tp.TotalPrice,
                    EventStatus = tp.Event.Status.ToString(),
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

        /// <summary>
        /// BR-144 / BR-145: Owner cancels a Drop-in Event.
        /// Blocked if StartTime is within 6 hours. Issues 100% refund to all Joined participants.
        /// </summary>
        public async Task<int> CancelDropInEventAsync(int eventId, string ownerId, string? cancelNote)
        {
            // 1. Load the event (with details for start time, and participants for refund)
           var ticketEvent = await _unitOfWork.TicketEvents.GetByIdAsync(eventId);
            if (ticketEvent == null)
                throw new NotFoundException("Sự kiện này không tồn tại.");

            // 2. Authorize: only the owner of the event may cancel it
            if (ticketEvent.OwnerId != ownerId)
                throw new ForbiddenException("Bạn không có quyền hủy sự kiện này.");

            // 3. Guard: can only cancel if still Pending
            if (ticketEvent.Status != TicketEventStatus.Pending)
                throw new BadRequestException("Chỉ sự kiện đang chờ mới có thể hủy.");

            
            // 5. Load all paid (Joined) participants
            var joinedParticipants = await _unitOfWork.TicketParticipants.GetJoinedParticipantsByEventIdAsync(eventId);
            int refundedCount = joinedParticipants.Count;

            // 6. A2: If no participants, skip refund + notification
            if (refundedCount > 0)
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    foreach (var participant in joinedParticipants)
                    {
                        // BR-145: 100% refund to each participant's wallet
                        var wallet = await _unitOfWork.Wallets.GetByUserId(participant.UserId);
                        if (wallet == null)
                        {
                            _logger.LogWarning("Wallet not found for user {UserId} during event {EventId} cancel refund", participant.UserId, eventId);
                            continue;
                        }

                        wallet.Balance += participant.TotalPrice;
                        _unitOfWork.Wallets.Update(wallet);

                        _unitOfWork.WalletTransactions.Add(new WalletTransaction
                        {
                            WalletId = wallet.Id,
                            TransactionType = TransactionType.Refund,
                            Direction = TransactionDirection.Credit,
                            Amount = participant.TotalPrice,
                            ReferenceId = ticketEvent.Id
                        });

                        // Mark participant as Cancelled
                        participant.Status = TicketParticipantStatus.Cancelled;
                        _unitOfWork.TicketParticipants.Update(participant);
                    }

                    // 7. Cancel the event
                    ticketEvent.Status = TicketEventStatus.Cancelled;
                    _unitOfWork.TicketEvents.Update(ticketEvent);

                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();
                }
                catch (Exception ex)
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    _logger.LogError(ex, "Failed to cancel event {EventId} and process refunds", eventId);
                    throw;
                }

                // 8. Send push notifications (fire-and-forget, don't fail the whole request)
                foreach (var participant in joinedParticipants)
                {
                    try
                    {
                        await _notificationService.NotifyEventCancelledByOwnerAsync(
                            participant.UserId,
                            eventId,
                            ticketEvent.Name,
                            cancelNote,
                            participant.TotalPrice);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send cancellation notification to user {UserId}", participant.UserId);
                    }
                }
            }
            else
            {
                // A2: No participants — just cancel the event
                ticketEvent.Status = TicketEventStatus.Cancelled;
                _unitOfWork.TicketEvents.Update(ticketEvent);
                await _unitOfWork.SaveChangesAsync();
            }

            _logger.LogInformation(
                "Event {EventId} cancelled by owner {OwnerId}. Refunded {Count} participants.",
                eventId, ownerId, refundedCount);

            return refundedCount;
        }

        public async Task CustomerCancelDropInEventAsync(int ticketId, string? userId)
        {
            if (userId == null)
                throw new UnauthorizedAccessException("Không thể xác định danh tính người dùng.");

            var ticket = await _unitOfWork.TicketParticipants.GetByIdAsync(ticketId) ?? throw new NotFoundException("Không tìm thấy vé tham gia sự kiện.");
            if (ticket.Status != TicketParticipantStatus.Joined)
                throw new BadRequestException("Chỉ có vé đã thanh toán có thể hủy.");
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                ticket.Status = TicketParticipantStatus.Cancelled;
                _unitOfWork.TicketParticipants.Update(ticket);
                var wallet = await _unitOfWork.Wallets.GetByUserId(userId) ?? throw new NotFoundException("Không tìm thấy ví.");
                var earliestSlot = await _unitOfWork.TicketEventsDetails.GetEarliestDetailAsync(ticket.EventId)
                    ?? throw new NotFoundException("Không tìm thấy slot của sự kiện.");

                if (earliestSlot.Slot == null)
                    throw new BadRequestException("Slot không hợp lệ.");
                var thisEvent = await _unitOfWork.TicketEvents.GetByIdAsync(ticket.EventId) ?? throw new NotFoundException("Không tìm thấy sự kiện.");
                var eventDateTime = thisEvent.EventDate
                    .ToDateTime(earliestSlot.Slot.StartTime);

                var hoursBeforeEvent = (eventDateTime - DateTime.Now).TotalHours;
                if (hoursBeforeEvent <= 6)
                {
                    throw new BadRequestException("Đã qua thời gian huỷ vé (trên 6 giờ trước sự kiện).");
                }
                wallet.Balance += ticket.TotalPrice;
                _unitOfWork.Wallets.Update(wallet);
                _unitOfWork.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = wallet.Id,
                    TransactionType = TransactionType.Refund,
                    Direction = TransactionDirection.Credit,
                    Amount = ticket.TotalPrice,
                    ReferenceId = ticket.EventId
                });
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackTransactionAsync();
                _logger.LogError(ex, "Error while customer canceling ticket {TicketId} for event {EventId}", ticketId, ticket.EventId);
                throw;
            }
        }

    }
}