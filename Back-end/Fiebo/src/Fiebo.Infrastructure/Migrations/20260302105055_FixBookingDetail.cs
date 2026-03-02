using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixBookingDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Fields_BookingsDetail_BookingDetailId",
                table: "Fields");

            migrationBuilder.DropIndex(
                name: "IX_Fields_BookingDetailId",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "BookingDetailId",
                table: "Fields");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BookingDetailId",
                table: "Fields",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Fields_BookingDetailId",
                table: "Fields",
                column: "BookingDetailId");

            migrationBuilder.AddForeignKey(
                name: "FK_Fields_BookingsDetail_BookingDetailId",
                table: "Fields",
                column: "BookingDetailId",
                principalTable: "BookingsDetail",
                principalColumn: "Id");
        }
    }
}
