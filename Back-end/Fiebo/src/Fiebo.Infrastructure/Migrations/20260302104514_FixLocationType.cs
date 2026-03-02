using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixLocationType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Venues_VenueId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_VenueId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "VenueId",
                table: "Reviews");

            migrationBuilder.AlterColumn<double>(
                name: "Longitude",
                table: "Venues",
                type: "double",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(9,6)",
                oldPrecision: 9,
                oldScale: 6);

            migrationBuilder.AlterColumn<double>(
                name: "Latitude",
                table: "Venues",
                type: "double",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(9,6)",
                oldPrecision: 9,
                oldScale: 6);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Longitude",
                table: "Venues",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double");

            migrationBuilder.AlterColumn<decimal>(
                name: "Latitude",
                table: "Venues",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double");

            migrationBuilder.AddColumn<int>(
                name: "VenueId",
                table: "Reviews",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_VenueId",
                table: "Reviews",
                column: "VenueId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Venues_VenueId",
                table: "Reviews",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id");
        }
    }
}
