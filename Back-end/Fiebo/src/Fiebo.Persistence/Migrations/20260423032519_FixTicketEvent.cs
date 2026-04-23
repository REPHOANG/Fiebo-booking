using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixTicketEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "TicketEvent");

            migrationBuilder.AddColumn<int>(
                name: "VenueId",
                table: "TicketEvent",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_TicketEvent_VenueId",
                table: "TicketEvent",
                column: "VenueId");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketEvent_Venues_VenueId",
                table: "TicketEvent",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketEvent_Venues_VenueId",
                table: "TicketEvent");

            migrationBuilder.DropIndex(
                name: "IX_TicketEvent_VenueId",
                table: "TicketEvent");

            migrationBuilder.DropColumn(
                name: "VenueId",
                table: "TicketEvent");

            migrationBuilder.AddColumn<string>(
                name: "OwnerId",
                table: "TicketEvent",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
