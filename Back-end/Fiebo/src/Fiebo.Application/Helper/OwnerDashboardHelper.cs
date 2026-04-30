using Fiebo.Application.DTOs.Booking;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;

namespace Fiebo.Application.Helper
{
    internal static class OwnerDashboardHelper
    {
        public static (DateOnly From, DateOnly To) ResolveDateRange(DateOnly? fromDate, DateOnly? toDate)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var to = toDate ?? today;
            var from = fromDate ?? to.AddDays(-6);

            if (from > to)
            {
                throw new BadRequestException("fromDate không thể lớn hơn toDate.");
            }

            return (from, to);
        }

        public static OwnerDashboardMetrics CalculateDashboardMetrics(
            List<OwnerDashboardBookingRow> currentRows,
            List<OwnerDashboardBookingSummaryRow> previousRows,
            Dictionary<int, decimal> refundByBookingId)
        {
            var currentBookingMetrics = currentRows
                .Select(b => CalculateBookingRevenue(
                    b.Status,
                    b.TotalPrice,
                    refundByBookingId.TryGetValue(b.BookingId, out var refundAmount) ? refundAmount : 0m))
                .ToList();

            var previousBookingMetrics = previousRows
                .Select(b => CalculateBookingRevenue(
                    b.Status,
                    b.TotalPrice,
                    refundByBookingId.TryGetValue(b.BookingId, out var refundAmount) ? refundAmount : 0m))
                .ToList();

            return new OwnerDashboardMetrics
            {
                CurrentBookings = currentRows.Count,
                PreviousBookings = previousRows.Count,
                CurrentRevenue = currentBookingMetrics.Sum(),
                PreviousRevenue = previousBookingMetrics.Sum(),
                CompletedBookings = currentRows.Count(b => b.Status == BookingStatus.Completed),
                CancelledBookings = currentRows.Count(b => b.Status is BookingStatus.OwnerCancelled or BookingStatus.CustomerCancelled)
            };
        }

        public static OwnerDashboardPeakSlotRow? GetPeakSlot(List<OwnerDashboardBookingRow> currentRows)
        {
            return currentRows
                .SelectMany(b => b.Slots)
                .Where(s => s.StartTime.HasValue && s.EndTime.HasValue)
                .GroupBy(s => new { s.SlotId, s.StartTime, s.EndTime })
                .Select(g => new OwnerDashboardPeakSlotRow
                {
                    SlotId = g.Key.SlotId,
                    StartTime = g.Key.StartTime!.Value,
                    EndTime = g.Key.EndTime!.Value,
                    BookingCount = g.Count()
                })
                .OrderByDescending(x => x.BookingCount)
                .ThenBy(x => x.SlotId)
                .FirstOrDefault();
        }

        public static OwnerDashboardResponse BuildOwnerDashboardResponse(
            DateOnly from,
            DateOnly to,
            int? venueId,
            OwnerDashboardMetrics metrics,
            OwnerDashboardPeakSlotRow? peakSlot,
            OwnerDashboardTrendData trendData,
            List<OwnerDashboardDistributionRow> distributionRows)
        {
            return new OwnerDashboardResponse
            {
                FromDate = from,
                ToDate = to,
                VenueId = venueId,
                TotalBookings = metrics.CurrentBookings,
                TotalRevenue = metrics.CurrentRevenue,
                BookingChangePercent = CalculateChangePercent(metrics.CurrentBookings, metrics.PreviousBookings),
                RevenueChangePercent = CalculateChangePercent(metrics.CurrentRevenue, metrics.PreviousRevenue),
                CompletionRate = CalculateRatePercent(metrics.CompletedBookings, metrics.CurrentBookings),
                CancellationRate = CalculateRatePercent(metrics.CancelledBookings, metrics.CurrentBookings),
                PeakTime = peakSlot == null
                    ? null
                    : new OwnerDashboardPeakTimeItem
                    {
                        StartTime = peakSlot.StartTime,
                        EndTime = peakSlot.EndTime,
                        BookingCount = peakSlot.BookingCount
                    },
                RevenueTrend = new OwnerDashboardChartData
                {
                    Labels = trendData.Labels,
                    Datasets =
                    [
                        new OwnerDashboardChartDataset
                        {
                            Label = "Revenue",
                            Data = trendData.RevenueData
                        }
                    ]
                },
                BookingTrend = new OwnerDashboardChartData
                {
                    Labels = trendData.Labels,
                    Datasets =
                    [
                        new OwnerDashboardChartDataset
                        {
                            Label = "Bookings",
                            Data = trendData.BookingData
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

    }
}
