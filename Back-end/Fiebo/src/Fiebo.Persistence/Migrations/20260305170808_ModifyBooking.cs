using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ModifyBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_Fields_FieldId",
                table: "BookingDetails");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_FieldId",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "BookingDate",
                table: "Bookings");

            migrationBuilder.AddColumn<string>(
                name: "BookingNote",
                table: "Bookings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Fullname",
                table: "Bookings",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "Bookings",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateOnly>(
                name: "BookingDate",
                table: "BookingDetails",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            //migrationBuilder.CreateIndex(
            //    name: "IX_BookingDetails_FieldId_SlotId_BookingDate",
            //    table: "BookingDetails",
            //    columns: new[] { "FieldId", "SlotId", "BookingDate" },
            //    unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_FieldId_SlotId_BookingDate",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "BookingNote",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Fullname",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "BookingDate",
                table: "BookingDetails");

            migrationBuilder.AddColumn<DateOnly>(
                name: "BookingDate",
                table: "Bookings",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_FieldId",
                table: "BookingDetails",
                column: "FieldId");
        }
    }
}
