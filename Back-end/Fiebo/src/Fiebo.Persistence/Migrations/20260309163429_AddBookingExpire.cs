using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingExpire : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_FieldId_SlotId_BookingDate",
                table: "BookingDetails");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpireAt",
                table: "Bookings",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_FieldId",
                table: "BookingDetails",
                column: "FieldId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_FieldId",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "ExpireAt",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_FieldId_SlotId_BookingDate",
                table: "BookingDetails",
                columns: new[] { "FieldId", "SlotId", "BookingDate" },
                unique: true);
        }
    }
}
