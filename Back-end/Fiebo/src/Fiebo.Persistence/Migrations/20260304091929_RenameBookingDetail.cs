using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameBookingDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingsDetail_Bookings_BookingId",
                table: "BookingsDetail");

            migrationBuilder.DropForeignKey(
                name: "FK_BookingsDetail_Fields_FieldId",
                table: "BookingsDetail");

            migrationBuilder.DropForeignKey(
                name: "FK_BookingsDetail_TimeSlots_SlotId",
                table: "BookingsDetail");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_BookingsDetail_BookingDetailId",
                table: "Reviews");

            migrationBuilder.DropPrimaryKey(
                name: "PK_BookingsDetail",
                table: "BookingsDetail");

            migrationBuilder.RenameTable(
                name: "BookingsDetail",
                newName: "BookingDetails");

            migrationBuilder.RenameIndex(
                name: "IX_BookingsDetail_SlotId",
                table: "BookingDetails",
                newName: "IX_BookingDetails_SlotId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingsDetail_FieldId",
                table: "BookingDetails",
                newName: "IX_BookingDetails_FieldId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingsDetail_BookingId",
                table: "BookingDetails",
                newName: "IX_BookingDetails_BookingId");

            migrationBuilder.AlterColumn<double>(
                name: "Rating",
                table: "Reviews",
                type: "double",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "float");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BookingDetails",
                table: "BookingDetails",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_Bookings_BookingId",
                table: "BookingDetails",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_Fields_FieldId",
                table: "BookingDetails",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_TimeSlots_SlotId",
                table: "BookingDetails",
                column: "SlotId",
                principalTable: "TimeSlots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_BookingDetails_BookingDetailId",
                table: "Reviews",
                column: "BookingDetailId",
                principalTable: "BookingDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_Bookings_BookingId",
                table: "BookingDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_Fields_FieldId",
                table: "BookingDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_TimeSlots_SlotId",
                table: "BookingDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_BookingDetails_BookingDetailId",
                table: "Reviews");

            migrationBuilder.DropPrimaryKey(
                name: "PK_BookingDetails",
                table: "BookingDetails");

            migrationBuilder.RenameTable(
                name: "BookingDetails",
                newName: "BookingsDetail");

            migrationBuilder.RenameIndex(
                name: "IX_BookingDetails_SlotId",
                table: "BookingsDetail",
                newName: "IX_BookingsDetail_SlotId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingDetails_FieldId",
                table: "BookingsDetail",
                newName: "IX_BookingsDetail_FieldId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingDetails_BookingId",
                table: "BookingsDetail",
                newName: "IX_BookingsDetail_BookingId");

            migrationBuilder.AlterColumn<float>(
                name: "Rating",
                table: "Reviews",
                type: "float",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BookingsDetail",
                table: "BookingsDetail",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BookingsDetail_Bookings_BookingId",
                table: "BookingsDetail",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingsDetail_Fields_FieldId",
                table: "BookingsDetail",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingsDetail_TimeSlots_SlotId",
                table: "BookingsDetail",
                column: "SlotId",
                principalTable: "TimeSlots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_BookingsDetail_BookingDetailId",
                table: "Reviews",
                column: "BookingDetailId",
                principalTable: "BookingsDetail",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
