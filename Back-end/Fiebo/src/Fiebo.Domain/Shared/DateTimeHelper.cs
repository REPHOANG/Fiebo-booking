namespace Fiebo.Domain.Shared
{
    public static class DateTimeHelper
    {
        private static readonly TimeZoneInfo VietnamTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

        /// <summary>
        /// Returns the current date and time in Vietnam timezone (UTC+7).
        /// </summary>
        public static DateTime VietnamNow =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);
    }
}
