using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ModifyReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_BookingDetails_BookingDetailId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_BookingDetailId",
                table: "Reviews");

            migrationBuilder.RenameColumn(
                name: "BookingDetailId",
                table: "Reviews",
                newName: "BookingId");

            migrationBuilder.AddColumn<int>(
                name: "VenueId",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookingId",
                table: "Reviews",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_VenueId",
                table: "Bookings",
                column: "VenueId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_Venues_VenueId",
                table: "Bookings",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_Venues_VenueId",
                table: "Bookings");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_BookingId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_VenueId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "VenueId",
                table: "Bookings");

            migrationBuilder.RenameColumn(
                name: "BookingId",
                table: "Reviews",
                newName: "BookingDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookingDetailId",
                table: "Reviews",
                column: "BookingDetailId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_BookingDetails_BookingDetailId",
                table: "Reviews",
                column: "BookingDetailId",
                principalTable: "BookingDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
