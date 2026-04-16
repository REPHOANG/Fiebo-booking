using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Helper;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Application.Services
{
    public class OwnerService : IOwnerService
    {
        private readonly IUnitOfWork _unitOfWork;

        public OwnerService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<OwnerDashboardResponse> GetOwnerDashboardAsync(
            string ownerId,
            DateOnly? fromDate,
            DateOnly? toDate,
            int? venueId)
        {
            var (from, to) = OwnerDashboardHelper.ResolveDateRange(fromDate, toDate);
            var periodDays = to.DayNumber - from.DayNumber + 1;
            var previousFrom = from.AddDays(-periodDays);
            var previousTo = from.AddDays(-1);

            var currentRows = await GetCurrentBookingRowsAsync(ownerId, from, to, venueId);
            var previousRows = await GetPreviousBookingRowsAsync(ownerId, previousFrom, previousTo, venueId);

            var allBookingIds = currentRows.Select(x => x.BookingId)
                .Concat(previousRows.Select(x => x.BookingId))
                .Distinct()
                .ToList();

            var refundByBookingId = await GetRefundByBookingIdAsync(allBookingIds);
            var metrics = OwnerDashboardHelper.CalculateDashboardMetrics(currentRows, previousRows, refundByBookingId);
            var peakSlot = OwnerDashboardHelper.GetPeakSlot(currentRows);
            var currentEventSummary = await GetEventSummaryAsync(ownerId, from, to, venueId);
            var previousEventSummary = await GetEventSummaryAsync(ownerId, previousFrom, previousTo, venueId);

            var bookingTrendData = await GetTrendDataAsync(ownerId, from, to, venueId, periodDays);
            var eventTrendData = await GetEventTrendDataAsync(ownerId, from, to, venueId, periodDays);
            var trendData = MergeTrendData(bookingTrendData, eventTrendData);

            var bookingDistributionRows = await GetDistributionRowsAsync(ownerId, from, to);
            var eventDistributionRows = await GetEventDistributionRowsAsync(ownerId, from, to);
            var distributionRows = MergeDistributionRows(bookingDistributionRows, eventDistributionRows);

            var response = OwnerDashboardHelper.BuildOwnerDashboardResponse(from, to, venueId, metrics, peakSlot, trendData, distributionRows);

            // Include completed joined event participants in overall bookings/revenue KPIs and change percentages.
            response.TotalBookings += currentEventSummary.BookingCount;
            response.TotalRevenue += currentEventSummary.Revenue;

            var currentTotalBookings = metrics.CurrentBookings + currentEventSummary.BookingCount;
            var previousTotalBookings = metrics.PreviousBookings + previousEventSummary.BookingCount;
            var currentTotalRevenue = metrics.CurrentRevenue + currentEventSummary.Revenue;
            var previousTotalRevenue = metrics.PreviousRevenue + previousEventSummary.Revenue;

            response.BookingChangePercent = CalculateChangePercent(currentTotalBookings, previousTotalBookings);
            response.RevenueChangePercent = CalculateChangePercent(currentTotalRevenue, previousTotalRevenue);

            return response;
        }

        private IQueryable<OwnerDashboardEventParticipantRow> GetEventParticipantDashboardQuery(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var fromDateTime = from.ToDateTime(TimeOnly.MinValue);
            var toDateTime = to.ToDateTime(TimeOnly.MaxValue);

            var query = _unitOfWork.TicketParticipants
                .GetQueryable()
                .AsNoTracking()
                .Where(tp => tp.Event.OwnerId == ownerId
                    && tp.Event.Status == TicketEventStatus.Completed
                    && tp.Status == TicketParticipantStatus.Joined
                    && tp.JoinedAt >= fromDateTime
                    && tp.JoinedAt <= toDateTime);

            if (venueId.HasValue)
            {
                var selectedVenueId = venueId.Value;
                query = query.Where(tp => tp.Event.Details.Any(d => d.Field.VenueId == selectedVenueId));
            }

            return query.Select(tp => new OwnerDashboardEventParticipantRow
            {
                EventId = tp.EventId,
                JoinedAt = tp.JoinedAt,
                TotalPrice = tp.TotalPrice,
                VenueName = tp.Event.Details
                    .OrderBy(d => d.Id)
                    .Select(d => d.Field.Venue != null ? d.Field.Venue.Name : null)
                    .FirstOrDefault()
            });
        }

        private async Task<OwnerDashboardEventSummary> GetEventSummaryAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var query = GetEventParticipantDashboardQuery(ownerId, from, to, venueId);

            return new OwnerDashboardEventSummary
            {
                BookingCount = await query.CountAsync(),
                Revenue = await query.SumAsync(x => (decimal?)x.TotalPrice) ?? 0m
            };
        }

        private async Task<OwnerDashboardTrendData> GetEventTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId,
            int periodDays)
        {
            if (periodDays <= 30)
            {
                return await GetEventDailyTrendDataAsync(ownerId, from, to, venueId);
            }

            if (periodDays <= 90)
            {
                return await GetEventWeeklyTrendDataAsync(ownerId, from, to, venueId, periodDays);
            }

            return await GetEventMonthlyTrendDataAsync(ownerId, from, to, venueId);
        }

        private async Task<OwnerDashboardTrendData> GetEventDailyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var aggregates = await GetEventParticipantDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(x => x.JoinedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .ToListAsync();

            var byDate = aggregates
                .GroupBy(x => DateOnly.FromDateTime(x.Date))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var result = new OwnerDashboardTrendData();
            for (var date = from; date <= to; date = date.AddDays(1))
            {
                result.Labels.Add(date.ToString("yyyy-MM-dd"));
                if (byDate.TryGetValue(date, out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<OwnerDashboardTrendData> GetEventWeeklyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId,
            int periodDays)
        {
            var aggregates = await GetEventParticipantDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(x => new
                {
                    Year = x.JoinedAt.Year,
                    Week = ((x.JoinedAt.DayOfYear - 1) / 7) + 1
                })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Week,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .ToListAsync();

            var byWeekKey = aggregates
                .GroupBy(x => (x.Year, x.Week))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var weekTimeline = Enumerable.Range(0, periodDays)
                .Select(offset => from.AddDays(offset))
                .Select(d => new
                {
                    Year = d.Year,
                    Week = ((d.DayOfYear - 1) / 7) + 1
                })
                .Distinct()
                .ToList();

            var result = new OwnerDashboardTrendData();
            foreach (var item in weekTimeline)
            {
                result.Labels.Add($"{item.Year}-W{item.Week}");
                if (byWeekKey.TryGetValue((item.Year, item.Week), out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<OwnerDashboardTrendData> GetEventMonthlyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var aggregates = await GetEventParticipantDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(x => new
                {
                    Year = x.JoinedAt.Year,
                    Month = x.JoinedAt.Month
                })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .ToListAsync();

            var byMonthKey = aggregates
                .GroupBy(x => (x.Year, x.Month))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var monthAnchor = new DateOnly(from.Year, from.Month, 1);
            var monthCount = ((to.Year - monthAnchor.Year) * 12 + (to.Month - monthAnchor.Month)) + 1;

            var result = new OwnerDashboardTrendData();
            for (var index = 0; index < monthCount; index++)
            {
                var monthDate = monthAnchor.AddMonths(index);
                result.Labels.Add(monthDate.ToString("yyyy-MM"));
                if (byMonthKey.TryGetValue((monthDate.Year, monthDate.Month), out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<List<OwnerDashboardDistributionRow>> GetEventDistributionRowsAsync(
            string ownerId,
            DateOnly from,
            DateOnly to)
        {
            return await GetEventParticipantDashboardQuery(ownerId, from, to, null)
                .GroupBy(x => x.VenueName)
                .Select(g => new OwnerDashboardDistributionRow
                {
                    VenueName = g.Key ?? "Không xác định",
                    BookingCount = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .ToListAsync();
        }

        private static OwnerDashboardTrendData MergeTrendData(
            OwnerDashboardTrendData bookingTrend,
            OwnerDashboardTrendData eventTrend)
        {
            var eventByLabel = eventTrend.Labels
                .Select((label, index) => new
                {
                    label,
                    Revenue = index < eventTrend.RevenueData.Count ? eventTrend.RevenueData[index] : 0m,
                    Booking = index < eventTrend.BookingData.Count ? eventTrend.BookingData[index] : 0m
                })
                .ToDictionary(x => x.label, x => (x.Revenue, x.Booking));

            var merged = new OwnerDashboardTrendData();
            for (var index = 0; index < bookingTrend.Labels.Count; index++)
            {
                var label = bookingTrend.Labels[index];
                var bookingRevenue = index < bookingTrend.RevenueData.Count ? bookingTrend.RevenueData[index] : 0m;
                var bookingCount = index < bookingTrend.BookingData.Count ? bookingTrend.BookingData[index] : 0m;
                var eventPoint = eventByLabel.TryGetValue(label, out var value) ? value : (0m, 0m);

                merged.Labels.Add(label);
                merged.RevenueData.Add(bookingRevenue + eventPoint.Item1);
                merged.BookingData.Add(bookingCount + eventPoint.Item2);
            }

            return merged;
        }

        private static List<OwnerDashboardDistributionRow> MergeDistributionRows(
            List<OwnerDashboardDistributionRow> bookingRows,
            List<OwnerDashboardDistributionRow> eventRows)
        {
            return bookingRows
                .Concat(eventRows)
                .GroupBy(x => x.VenueName)
                .Select(g => new OwnerDashboardDistributionRow
                {
                    VenueName = g.Key,
                    BookingCount = g.Sum(x => x.BookingCount),
                    Revenue = g.Sum(x => x.Revenue)
                })
                .OrderByDescending(x => x.BookingCount)
                .ToList();
        }

        private static double CalculateChangePercent(decimal current, decimal previous)
        {
            if (previous == 0)
            {
                return current == 0 ? 0 : 100;
            }

            return Math.Round((double)((current - previous) / previous * 100m), 2);
        }

        private async Task<List<OwnerDashboardBookingRow>> GetCurrentBookingRowsAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            return await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, venueId)
                .Select(b => new OwnerDashboardBookingRow
                {
                    BookingId = b.Id,
                    VenueId = b.VenueId,
                    VenueName = b.Venue.Name,
                    CreatedAt = b.CreatedAt,
                    Status = b.Status,
                    TotalPrice = b.TotalPrice,
                    Slots = b.BookingDetails
                        .Select(d => new OwnerDashboardSlotRow
                        {
                            SlotId = d.SlotId,
                            StartTime = d.TimeSlot != null ? d.TimeSlot.StartTime : null,
                            EndTime = d.TimeSlot != null ? d.TimeSlot.EndTime : null
                        })
                        .ToList()
                })
                .ToListAsync();
        }

        private async Task<List<OwnerDashboardBookingSummaryRow>> GetPreviousBookingRowsAsync(
            string ownerId,
            DateOnly previousFrom,
            DateOnly previousTo,
            int? venueId)
        {
            return await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, previousFrom, previousTo, venueId)
                .Select(b => new OwnerDashboardBookingSummaryRow
                {
                    BookingId = b.Id,
                    Status = b.Status,
                    TotalPrice = b.TotalPrice
                })
                .ToListAsync();
        }

        private async Task<Dictionary<int, decimal>> GetRefundByBookingIdAsync(List<int> bookingIds)
        {
            if (bookingIds.Count == 0)
            {
                return new Dictionary<int, decimal>();
            }

            return await _unitOfWork.CancelBooking
                .GetQueryable()
                .AsNoTracking()
                .Where(cb => bookingIds.Contains(cb.BookingId))
                .GroupBy(cb => cb.BookingId)
                .Select(g => new { BookingId = g.Key, RefundAmount = g.Sum(x => x.RefundAmount) })
                .ToDictionaryAsync(x => x.BookingId, x => x.RefundAmount);
        }

        private async Task<OwnerDashboardTrendData> GetTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId,
            int periodDays)
        {
            if (periodDays <= 30)
            {
                return await GetDailyTrendDataAsync(ownerId, from, to, venueId);
            }

            if (periodDays <= 90)
            {
                return await GetWeeklyTrendDataAsync(ownerId, from, to, venueId, periodDays);
            }

            return await GetMonthlyTrendDataAsync(ownerId, from, to, venueId);
        }

        private async Task<OwnerDashboardTrendData> GetDailyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var aggregates = await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(b => b.CreatedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(b => b.Status == BookingStatus.Completed
                        ? b.TotalPrice
                        : b.Status == BookingStatus.CustomerCancelled
                            ? b.TotalPrice - (b.CancelBooking != null ? b.CancelBooking.RefundAmount : 0m)
                            : 0m)
                })
                .ToListAsync();

            var byDate = aggregates
                .GroupBy(x => DateOnly.FromDateTime(x.Date))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var result = new OwnerDashboardTrendData();
            for (var date = from; date <= to; date = date.AddDays(1))
            {
                result.Labels.Add(date.ToString("yyyy-MM-dd"));
                if (byDate.TryGetValue(date, out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<OwnerDashboardTrendData> GetWeeklyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId,
            int periodDays)
        {
            var aggregates = await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(b => new
                {
                    Year = b.CreatedAt.Year,
                    Week = ((b.CreatedAt.DayOfYear - 1) / 7) + 1
                })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Week,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(b => b.Status == BookingStatus.Completed
                        ? b.TotalPrice
                        : b.Status == BookingStatus.CustomerCancelled
                            ? b.TotalPrice - (b.CancelBooking != null ? b.CancelBooking.RefundAmount : 0m)
                            : 0m)
                })
                .ToListAsync();

            var byWeekKey = aggregates
                .GroupBy(x => (x.Year, x.Week))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var weekTimeline = Enumerable.Range(0, periodDays)
                .Select(offset => from.AddDays(offset))
                .Select(d => new
                {
                    Year = d.Year,
                    Week = ((d.DayOfYear - 1) / 7) + 1
                })
                .Distinct()
                .ToList();

            var result = new OwnerDashboardTrendData();
            foreach (var item in weekTimeline)
            {
                result.Labels.Add($"{item.Year}-W{item.Week}");
                if (byWeekKey.TryGetValue((item.Year, item.Week), out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<OwnerDashboardTrendData> GetMonthlyTrendDataAsync(
            string ownerId,
            DateOnly from,
            DateOnly to,
            int? venueId)
        {
            var aggregates = await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, venueId)
                .GroupBy(b => new
                {
                    Year = b.CreatedAt.Year,
                    Month = b.CreatedAt.Month
                })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(b => b.Status == BookingStatus.Completed
                        ? b.TotalPrice
                        : b.Status == BookingStatus.CustomerCancelled
                            ? b.TotalPrice - (b.CancelBooking != null ? b.CancelBooking.RefundAmount : 0m)
                            : 0m)
                })
                .ToListAsync();

            var byMonthKey = aggregates
                .GroupBy(x => (x.Year, x.Month))
                .ToDictionary(
                    g => g.Key,
                    g => new OwnerDashboardTrendPoint
                    {
                        BookingCount = g.Sum(x => x.BookingCount),
                        Revenue = g.Sum(x => x.Revenue)
                    });

            var monthAnchor = new DateOnly(from.Year, from.Month, 1);
            var monthCount = ((to.Year - monthAnchor.Year) * 12 + (to.Month - monthAnchor.Month)) + 1;

            var result = new OwnerDashboardTrendData();
            for (var index = 0; index < monthCount; index++)
            {
                var monthDate = monthAnchor.AddMonths(index);
                result.Labels.Add(monthDate.ToString("yyyy-MM"));
                if (byMonthKey.TryGetValue((monthDate.Year, monthDate.Month), out var value))
                {
                    result.RevenueData.Add(value.Revenue);
                    result.BookingData.Add(value.BookingCount);
                }
                else
                {
                    result.RevenueData.Add(0m);
                    result.BookingData.Add(0m);
                }
            }

            return result;
        }

        private async Task<List<OwnerDashboardDistributionRow>> GetDistributionRowsAsync(
            string ownerId,
            DateOnly from,
            DateOnly to)
        {
            return await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, null)
                .GroupBy(b => b.Venue.Name)
                .Select(g => new OwnerDashboardDistributionRow
                {
                    VenueName = g.Key,
                    BookingCount = g.Count(),
                    Revenue = g.Sum(b => b.Status == BookingStatus.Completed
                        ? b.TotalPrice
                        : b.Status == BookingStatus.CustomerCancelled
                            ? b.TotalPrice - (b.CancelBooking != null ? b.CancelBooking.RefundAmount : 0m)
                            : 0m)
                })
                .OrderByDescending(x => x.BookingCount)
                .ToListAsync();
        }
    }
}
