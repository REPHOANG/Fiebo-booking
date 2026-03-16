using Fiebo.Application.DTOs.Event;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
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
        public EventService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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
            var address = $"{eventDetail.Field.Venue?.AddressDetail}, {eventDetail.Field.Venue?.Ward?.Name}, {eventDetail.Field.Venue?.Province?.Name}";
            var remainingTicketQuantity = eventDetail.MaxPlayer - (await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId));
            return new TicketEventDetailResponse
            {
                EventId = eventDetail.EventId,
                VenueName = eventDetail.Field.Venue?.Name ?? "",
                VenueAddress = address,
                FieldName = eventDetail.Field.Name,
                EventDate = eventDetail.EventDate,
                StartTime = eventDetail.Slot.StartTime,
                EndTime = eventDetail.Slot.EndTime,
                TicketPrice = eventDetail.PricePerPerson,
                TicketQuantity = eventDetail.MaxPlayer,
                RemainingTicketQuantity = remainingTicketQuantity
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
        public async Task<bool> JoinDropInEventAsync(JoinEventRequest request, int eventId, string userId)
        {
            var dropInEvent = await _unitOfWork.TicketEvents.GetByIdAsync(eventId);
            if (dropInEvent == null)
            {
                throw new NotFoundException("Không tìm thấy sự kiện");
            }
            if (dropInEvent.Status != TicketEventStatus.Pending)
            {
                throw new BadRequestException("Sự kiện không có sẵn");
            }
            var currentPlayer = await _unitOfWork.TicketParticipants.GetCurrentPlayer(eventId);
            if (currentPlayer >= dropInEvent.MaxPlayer)
            {
                throw new BadRequestException("Số lượng người tham gian sự kiện này đã đầy");
            }
            var participant = new TicketParticipant
            {
                EventId = eventId,
                UserId = userId,
                Fullname = request.Fullname,
                PhoneNumber = request.PhoneNumber,
                TicketQuantity = request.TicketQuantity,
                Status = TicketParticipantStatus.Pending,
            };
            _unitOfWork.TicketParticipants.Add(participant);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
