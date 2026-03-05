using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ModifyTimeSlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlots_Fields_FieldId",
                table: "TimeSlots");

            migrationBuilder.DropIndex(
                name: "IX_TimeSlots_FieldId_DayOfWeek",
                table: "TimeSlots");

            migrationBuilder.RenameColumn(
                name: "FieldId",
                table: "TimeSlots",
                newName: "VenueId");

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "StartTime",
                table: "TimeSlots",
                type: "time(6)",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "time");

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "EndTime",
                table: "TimeSlots",
                type: "time(6)",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "time");

            migrationBuilder.AlterColumn<string>(
                name: "DayOfWeek",
                table: "TimeSlots",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "SportTypeId",
                table: "TimeSlots",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_SportTypeId",
                table: "TimeSlots",
                column: "SportTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_VenueId_SportTypeId_DayOfWeek_StartTime",
                table: "TimeSlots",
                columns: new[] { "VenueId", "SportTypeId", "DayOfWeek", "StartTime" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlots_SportTypes_SportTypeId",
                table: "TimeSlots",
                column: "SportTypeId",
                principalTable: "SportTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlots_Venues_VenueId",
                table: "TimeSlots",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlots_SportTypes_SportTypeId",
                table: "TimeSlots");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlots_Venues_VenueId",
                table: "TimeSlots");

            migrationBuilder.DropIndex(
                name: "IX_TimeSlots_SportTypeId",
                table: "TimeSlots");

            migrationBuilder.DropIndex(
                name: "IX_TimeSlots_VenueId_SportTypeId_DayOfWeek_StartTime",
                table: "TimeSlots");

            migrationBuilder.DropColumn(
                name: "SportTypeId",
                table: "TimeSlots");

            migrationBuilder.RenameColumn(
                name: "VenueId",
                table: "TimeSlots",
                newName: "FieldId");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "StartTime",
                table: "TimeSlots",
                type: "time",
                nullable: false,
                oldClrType: typeof(TimeOnly),
                oldType: "time(6)");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "EndTime",
                table: "TimeSlots",
                type: "time",
                nullable: false,
                oldClrType: typeof(TimeOnly),
                oldType: "time(6)");

            migrationBuilder.AlterColumn<int>(
                name: "DayOfWeek",
                table: "TimeSlots",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20)
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_FieldId_DayOfWeek",
                table: "TimeSlots",
                columns: new[] { "FieldId", "DayOfWeek" });

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlots_Fields_FieldId",
                table: "TimeSlots",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
