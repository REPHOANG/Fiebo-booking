using System;

namespace Fiebo.Application.Validators
{
    public static class BookingDateValidator
    {
        public static DateOnly GetMaxDate(DateTime now)
        {
            var startOfThisMonth = new DateTime(now.Year, now.Month, 1);
            var endOfNextMonth = startOfThisMonth.AddMonths(2).AddDays(-1);
            return DateOnly.FromDateTime(endOfNextMonth);
        }
    }
}