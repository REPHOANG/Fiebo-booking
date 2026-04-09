using Fiebo.Application.DTOs.Booking;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
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
            var today = DateOnly.FromDateTime(DateTime.Now);
            var to = toDate ?? today;
            var from = fromDate ?? to.AddDays(-29);

            if (from > to)
            {
                throw new BadRequestException("fromDate không thể lớn hơn toDate.");
            }

            var periodDays = to.DayNumber - from.DayNumber + 1;
            var previousFrom = from.AddDays(-periodDays);
            var previousTo = from.AddDays(-1);

            var currentQuery = _unitOfWork.Bookings.GetOwnerDashboardQuery(ownerId, from, to, venueId);

            var currentRows = await currentQuery
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

            var previousRows = await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, previousFrom, previousTo, venueId)
                .Select(b => new OwnerDashboardBookingSummaryRow
                {
                    BookingId = b.Id,
                    Status = b.Status,
                    TotalPrice = b.TotalPrice
                })
                .ToListAsync();

            var allBookingIds = currentRows.Select(x => x.BookingId)
                .Concat(previousRows.Select(x => x.BookingId))
                .Distinct()
                .ToList();

            var refundByBookingId = allBookingIds.Count == 0
                ? new Dictionary<int, decimal>()
                : await _unitOfWork.CancelBooking
                    .GetQueryable()
                    .AsNoTracking()
                    .Where(cb => allBookingIds.Contains(cb.BookingId))
                    .GroupBy(cb => cb.BookingId)
                    .Select(g => new { BookingId = g.Key, RefundAmount = g.Sum(x => x.RefundAmount) })
                    .ToDictionaryAsync(x => x.BookingId, x => x.RefundAmount);

            var currentBookingMetrics = currentRows
                .Select(b => new
                {
                    Booking = b,
                    Revenue = CalculateBookingRevenue(
                        b.Status,
                        b.TotalPrice,
                        refundByBookingId.TryGetValue(b.BookingId, out var refundAmount) ? refundAmount : 0m)
                })
                .ToList();

            var previousBookingMetrics = previousRows
                .Select(b => CalculateBookingRevenue(
                    b.Status,
                    b.TotalPrice,
                    refundByBookingId.TryGetValue(b.BookingId, out var refundAmount) ? refundAmount : 0m))
                .ToList();

            var currentBookings = currentRows.Count;
            var previousBookings = previousRows.Count;
            var currentRevenue = currentBookingMetrics.Sum(x => x.Revenue);
            var previousRevenue = previousBookingMetrics.Sum();

            var completedBookings = currentRows.Count(b => b.Status == BookingStatus.Completed);
            var cancelledBookings = currentRows.Count(b => b.Status is BookingStatus.OwnerCancelled or BookingStatus.CustomerCancelled);

            var peakSlot = currentRows
                .SelectMany(b => b.Slots)
                .Where(s => s.StartTime.HasValue && s.EndTime.HasValue)
                .GroupBy(s => new { s.SlotId, s.StartTime, s.EndTime })
                .OrderByDescending(g => g.Count())
                .ThenBy(g => g.Key.SlotId)
                .FirstOrDefault();

            var trendGrouping = periodDays <= 30
                ? TrendGrouping.Day
                : periodDays <= 90
                    ? TrendGrouping.Week
                    : TrendGrouping.Month;

            var trendLabels = new List<string>();
            var trendRevenueData = new List<decimal>();
            var trendBookingData = new List<decimal>();

            if (trendGrouping == TrendGrouping.Day)
            {
                var aggregates = await currentQuery
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
                        g => new
                        {
                            BookingCount = g.Sum(x => x.BookingCount),
                            Revenue = g.Sum(x => x.Revenue)
                        });

                for (var date = from; date <= to; date = date.AddDays(1))
                {
                    trendLabels.Add(date.ToString("yyyy-MM-dd"));
                    if (byDate.TryGetValue(date, out var value))
                    {
                        trendRevenueData.Add(value.Revenue);
                        trendBookingData.Add(value.BookingCount);
                    }
                    else
                    {
                        trendRevenueData.Add(0m);
                        trendBookingData.Add(0m);
                    }
                }
            }
            else if (trendGrouping == TrendGrouping.Week)
            {
                var aggregates = await currentQuery
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
                        g => new
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

                foreach (var item in weekTimeline)
                {
                    trendLabels.Add($"{item.Year}-W{item.Week}");
                    if (byWeekKey.TryGetValue((item.Year, item.Week), out var value))
                    {
                        trendRevenueData.Add(value.Revenue);
                        trendBookingData.Add(value.BookingCount);
                    }
                    else
                    {
                        trendRevenueData.Add(0m);
                        trendBookingData.Add(0m);
                    }
                }
            }
            else
            {
                var aggregates = await currentQuery
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
                        g => new
                        {
                            BookingCount = g.Sum(x => x.BookingCount),
                            Revenue = g.Sum(x => x.Revenue)
                        });

                var monthAnchor = new DateOnly(from.Year, from.Month, 1);
                var monthCount = ((to.Year - monthAnchor.Year) * 12 + (to.Month - monthAnchor.Month)) + 1;

                for (var index = 0; index < monthCount; index++)
                {
                    var monthDate = monthAnchor.AddMonths(index);
                    trendLabels.Add(monthDate.ToString("yyyy-MM"));

                    if (byMonthKey.TryGetValue((monthDate.Year, monthDate.Month), out var value))
                    {
                        trendRevenueData.Add(value.Revenue);
                        trendBookingData.Add(value.BookingCount);
                    }
                    else
                    {
                        trendRevenueData.Add(0m);
                        trendBookingData.Add(0m);
                    }
                }
            }

            var distributionRows = await _unitOfWork.Bookings
                .GetOwnerDashboardQuery(ownerId, from, to, null)
                .GroupBy(b => b.Venue.Name)
                .Select(g => new
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

            return new OwnerDashboardResponse
            {
                FromDate = from,
                ToDate = to,
                VenueId = venueId,

                TotalBookings = currentBookings,
                TotalRevenue = currentRevenue,
                BookingChangePercent = CalculateChangePercent(currentBookings, previousBookings),
                RevenueChangePercent = CalculateChangePercent(currentRevenue, previousRevenue),
                CompletionRate = CalculateRatePercent(completedBookings, currentBookings),
                CancellationRate = CalculateRatePercent(cancelledBookings, currentBookings),

                PeakTime = peakSlot == null
                    ? null
                    : new OwnerDashboardPeakTimeItem
                    {
                        StartTime = peakSlot.Key.StartTime!.Value,
                        EndTime = peakSlot.Key.EndTime!.Value,
                        BookingCount = peakSlot.Count()
                    },

                RevenueTrend = new OwnerDashboardChartData
                {
                    Labels = trendLabels,
                    Datasets =
                    [
                        new OwnerDashboardChartDataset
                        {
                            Label = "Revenue",
                            Data = trendRevenueData
                        }
                    ]
                },

                BookingTrend = new OwnerDashboardChartData
                {
                    Labels = trendLabels,
                    Datasets =
                    [
                        new OwnerDashboardChartDataset
                        {
                            Label = "Bookings",
                            Data = trendBookingData
                        }
                    ]
                },

                Distribution = new OwnerDashboardChartData
                {
                    Labels = distributionRows.Select(x => x.VenueName).ToList(),
                    Datasets =
                    [
                        new OwnerDashboardChartDataset
                        {
                            Label = "Revenue",
                            Data = distributionRows.Select(x => x.Revenue).ToList()
                        },
                        new OwnerDashboardChartDataset
                        {
                            Label = "Bookings",
                            Data = distributionRows.Select(x => (decimal)x.BookingCount).ToList()
                        }
                    ]
                }
            };
        }

        private static decimal CalculateBookingRevenue(BookingStatus status, decimal totalPrice, decimal refundAmount)
        {
            return status switch
            {
                BookingStatus.Completed => totalPrice,
                BookingStatus.CustomerCancelled => totalPrice - refundAmount,
                _ => 0m
            };
        }

        private static double CalculateChangePercent(decimal current, decimal previous)
        {
            if (previous == 0)
            {
                return current == 0 ? 0 : 100;
            }

            return Math.Round((double)((current - previous) / previous * 100m), 2);
        }

        private static double CalculateRatePercent(int count, int total)
        {
            if (total == 0)
            {
                return 0;
            }

            return Math.Round((double)count / total * 100d, 2);
        }

        private enum TrendGrouping
        {
            Day,
            Week,
            Month
        }

        private sealed class OwnerDashboardBookingRow
        {
            public int BookingId { get; set; }
            public int VenueId { get; set; }
            public string VenueName { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
            public BookingStatus Status { get; set; }
            public decimal TotalPrice { get; set; }
            public List<OwnerDashboardSlotRow> Slots { get; set; } = [];
        }

        private sealed class OwnerDashboardSlotRow
        {
            public int SlotId { get; set; }
            public TimeOnly? StartTime { get; set; }
            public TimeOnly? EndTime { get; set; }
        }

        private sealed class OwnerDashboardBookingSummaryRow
        {
            public int BookingId { get; set; }
            public BookingStatus Status { get; set; }
            public decimal TotalPrice { get; set; }
        }
    }
}
