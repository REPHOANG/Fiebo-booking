using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnerDashboardProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // -------- sp_dashboard_summary --------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_dashboard_summary;
CREATE PROCEDURE sp_dashboard_summary(
    IN p_from DATETIME,
    IN p_to DATETIME,
    IN p_ownerId VARCHAR(255)
)
BEGIN
    DECLARE totalBookings INT DEFAULT 0;
    DECLARE totalRevenue DECIMAL(18,2) DEFAULT 0;
    DECLARE prevBookings INT DEFAULT 0;
    DECLARE prevRevenue DECIMAL(18,2) DEFAULT 0;
    DECLARE completionRate DECIMAL(5,2) DEFAULT 0;
    DECLARE cancelRate DECIMAL(5,2) DEFAULT 0;
    DECLARE peakStart TIME;
    DECLARE peakEnd TIME;
    DECLARE diffSeconds INT;

    -- Total
    SELECT 
        COUNT(*),
        COALESCE(SUM(
            CASE 
                WHEN b.Status = 2 THEN b.TotalPrice
                WHEN b.Status = 4 THEN b.TotalPrice - IFNULL(cb.RefundAmount,0)
                ELSE 0
            END
        ),0)
    INTO totalBookings, totalRevenue
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    LEFT JOIN (
        SELECT BookingId, SUM(RefundAmount) AS RefundAmount
        FROM CancelBookings
        GROUP BY BookingId
    ) cb ON cb.BookingId = b.Id
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId;

    -- Previous period
    SET diffSeconds = TIMESTAMPDIFF(SECOND, p_from, p_to);

    SELECT 
        COUNT(*),
        COALESCE(SUM(
            CASE 
                WHEN b.Status = 2 THEN b.TotalPrice
                WHEN b.Status = 4 THEN b.TotalPrice - IFNULL(cb.RefundAmount,0)
                ELSE 0
            END
        ),0)
    INTO prevBookings, prevRevenue
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    LEFT JOIN (
        SELECT BookingId, SUM(RefundAmount) AS RefundAmount
        FROM CancelBookings
        GROUP BY BookingId
    ) cb ON cb.BookingId = b.Id
    WHERE b.CreatedAt BETWEEN DATE_SUB(p_from, INTERVAL diffSeconds SECOND) AND p_from
      AND v.OwnerId = p_ownerId;

    -- Completion rate
    SELECT 
        COUNT(CASE WHEN b.Status = 2 THEN 1 END)*100.0 / NULLIF(COUNT(*),0)
    INTO completionRate
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId;

    -- Cancellation rate
    SELECT 
        COUNT(CASE WHEN b.Status IN (3,4) THEN 1 END)*100.0 / NULLIF(COUNT(*),0)
    INTO cancelRate
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId;

    -- Peak time
    SELECT ts.StartTime, ts.EndTime
    INTO peakStart, peakEnd
    FROM bookingdetails bd
    JOIN bookings b ON b.Id = bd.BookingId
    JOIN venues v ON v.Id = b.VenueId
    JOIN timeslots ts ON ts.Id = bd.SlotId
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId
    GROUP BY bd.SlotId
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Final output
    SELECT 
        totalBookings AS TotalBookings,
        totalRevenue AS TotalRevenue,
        COALESCE(ROUND((totalBookings - prevBookings)/NULLIF(prevBookings,0)*100,2),0) AS BookingChangePercent,
        COALESCE(ROUND((totalRevenue - prevRevenue)/NULLIF(prevRevenue,0)*100,2),0) AS RevenueChangePercent,
        completionRate AS CompletionRate,
        cancelRate AS CancellationRate,
        peakStart AS PeakStartTime,
        peakEnd AS PeakEndTime;
END;
");

            // -------- sp_revenue_trend --------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_revenue_trend;
CREATE PROCEDURE sp_revenue_trend(
    IN p_from DATETIME,
    IN p_to DATETIME,
    IN p_ownerId VARCHAR(255)
)
BEGIN
    SELECT 
        DATE(b.CreatedAt) AS Date,
        SUM(
            CASE 
                WHEN b.Status = 2 THEN b.TotalPrice
                WHEN b.Status = 4 THEN b.TotalPrice - IFNULL(cb.RefundAmount, 0)
                ELSE 0
            END
        ) AS Value
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    LEFT JOIN CancelBookings cb ON cb.BookingId = b.Id
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId
    GROUP BY DATE(b.CreatedAt)
    ORDER BY Date;
END;
");

            // -------- sp_booking_trend --------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_booking_trend;
CREATE PROCEDURE sp_booking_trend(
    IN p_from DATETIME,
    IN p_to DATETIME,
    IN p_ownerId VARCHAR(255)
)
BEGIN
    SELECT 
        DATE(b.CreatedAt) AS Date, 
        COUNT(*) AS Value
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId
    GROUP BY DATE(b.CreatedAt)
    ORDER BY Date;
END;
");

            // -------- sp_distribution --------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_distribution;
CREATE PROCEDURE sp_distribution(
    IN p_ownerId VARCHAR(255),
    IN p_from DATE,
    IN p_to DATE
)
BEGIN
    SELECT 
        v.Id AS VenueId, 
        v.Name AS VenueName,
        COUNT(b.Id) AS BookingCount,
        SUM(
            CASE 
                WHEN b.Status = 2 THEN b.TotalPrice
                WHEN b.Status = 4 THEN b.TotalPrice - IFNULL(cb.RefundAmount, 0)
                ELSE 0
            END
        ) AS Revenue
    FROM bookings b
    JOIN venues v ON v.Id = b.VenueId
    LEFT JOIN CancelBookings cb ON cb.BookingId = b.Id
    WHERE b.CreatedAt BETWEEN p_from AND p_to
      AND v.OwnerId = p_ownerId
    GROUP BY v.Id, v.Name;
END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_dashboard_summary;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_revenue_trend;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_booking_trend;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_distribution;");
        }
    }
}