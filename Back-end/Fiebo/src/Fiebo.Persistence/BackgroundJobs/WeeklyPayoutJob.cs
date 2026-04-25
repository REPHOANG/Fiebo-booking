using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class WeeklyPayoutJob : IWeeklyPayoutJob
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IBookingService _bookingService;
        private readonly IEventService _eventService;
        private readonly IPayoutService _payoutService;

        public WeeklyPayoutJob(
            IUnitOfWork unitOfWork,
            IBookingService bookingService,
            IEventService eventService,
            IPayoutService payoutService)
        {
            _unitOfWork = unitOfWork;
            _bookingService = bookingService;
            _eventService = eventService;
            _payoutService = payoutService;
        }

        public async Task Run()
        {
            var now = DateTime.UtcNow;

            var from = now.Date.AddDays(-7);
            var to = now.Date;

            // 1. finalize
            await _bookingService.FinalizeBookingsAsync(now);
            await _eventService.FinalizeEventsAsync(now);

            // 2. create batch
            var batch = new PayoutBatch
            {
                FromDate = from,
                ToDate = to,
                Status = 0,
                CreatedAt = now
            };

            _unitOfWork.PayoutBatches.Add(batch);
            await _unitOfWork.SaveChangesAsync();

            // 3. data
            var bookingItems = await _payoutService.GetBookingPayouts(from, to);
            var eventItems = await _payoutService.GetEventPayouts(from, to);

            var all = bookingItems.Concat(eventItems);

            var grouped = all.GroupBy(x => x.OwnerId);

            foreach (var group in grouped)
            {
                var payout = new Payout
                {
                    BatchId = batch.Id,
                    OwnerId = group.Key,
                    Amount = group.Sum(x => x.Amount),
                    Status = PayoutStatus.Pending,
                    CreatedAt = now
                };

                _unitOfWork.Payouts.Add(payout);
                await _unitOfWork.SaveChangesAsync();

                foreach (var item in group)
                {
                    var detail = new PayoutDetail
                    {
                        PayoutId = payout.Id,
                        BookingId = item.Type == PayoutDetailType.Booking ? item.RefId : null,
                        EventId = item.Type == PayoutDetailType.Event ? item.RefId : null,
                        Amount = item.Amount,
                        PayoutDetailType = item.Type
                    };

                    _unitOfWork.PayoutDetails.Add(detail);
                }
            }

            await _unitOfWork.SaveChangesAsync();
        }
    }
}
