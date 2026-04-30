using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVenueIdToReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VenueId",
                table: "Reports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VenueName",
                table: "Reports",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_VenueId",
                table: "Reports",
                column: "VenueId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_Venues_VenueId",
                table: "Reports",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Venues_VenueId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_VenueId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "VenueId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "VenueName",
                table: "Reports");
        }
    }
}
