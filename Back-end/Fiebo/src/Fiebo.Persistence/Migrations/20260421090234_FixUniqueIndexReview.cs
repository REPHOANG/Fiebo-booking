using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixUniqueIndexReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop FK trước
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews");

            // 2. Drop index unique
            migrationBuilder.DropIndex(
                name: "IX_Reviews_BookingId",
                table: "Reviews");

            // 4. Add lại FK
            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId_BookingId",
                table: "Reviews",
                columns: new[] { "UserId", "BookingId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

            // 1. Drop FK hiện tại
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews");

            // 2. Drop composite index
            migrationBuilder.DropIndex(
                name: "IX_Reviews_UserId_BookingId",
                table: "Reviews");

            // 3. Tạo lại index unique cũ
            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookingId",
                table: "Reviews",
                column: "BookingId",
                unique: true);

            // 4. Add lại FK (gắn vào index vừa tạo)
            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Bookings_BookingId",
                table: "Reviews",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
