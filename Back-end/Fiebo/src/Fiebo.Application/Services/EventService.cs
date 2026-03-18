using Fiebo.Application.DTOs.Event;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
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
                throw new NotFoundException("Không tìm thấy sự kiện");
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
                throw new NotFoundException("Không tìm thấy vé");
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
                var dropInEvent = await _unitOfWork.TicketEvents.GetByIdAsync(eventId);
                if (dropInEvent == null)
                {
                    throw new NotFoundException("Không tìm thấy sự kiện");
                }

                if (dropInEvent.Status != TicketEventStatus.Pending)
                {
                    throw new BadRequestException("Sự kiện không có sẵn");
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
                throw new NotFoundException("Không tìm thấy vé");
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
                throw new NotFoundException("Không tìm thấy ví của người dùng");
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
    }
}