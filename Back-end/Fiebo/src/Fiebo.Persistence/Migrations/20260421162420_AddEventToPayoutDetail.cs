using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventToPayoutDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PayoutDetails_Bookings_BookingId",
                table: "PayoutDetails");

            migrationBuilder.AlterColumn<int>(
                name: "BookingId",
                table: "PayoutDetails",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "EventId",
                table: "PayoutDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PayoutDetailType",
                table: "PayoutDetails",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_PayoutDetails_EventId",
                table: "PayoutDetails",
                column: "EventId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PayoutDetails_Bookings_BookingId",
                table: "PayoutDetails",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayoutDetails_TicketEvent_EventId",
                table: "PayoutDetails",
                column: "EventId",
                principalTable: "TicketEvent",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PayoutDetails_Bookings_BookingId",
                table: "PayoutDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_PayoutDetails_TicketEvent_EventId",
                table: "PayoutDetails");

            migrationBuilder.DropIndex(
                name: "IX_PayoutDetails_EventId",
                table: "PayoutDetails");

            migrationBuilder.DropColumn(
                name: "EventId",
                table: "PayoutDetails");

            migrationBuilder.DropColumn(
                name: "PayoutDetailType",
                table: "PayoutDetails");

            migrationBuilder.AlterColumn<int>(
                name: "BookingId",
                table: "PayoutDetails",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PayoutDetails_Bookings_BookingId",
                table: "PayoutDetails",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
