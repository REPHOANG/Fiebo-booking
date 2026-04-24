using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLandUseDocument : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NewLandUseExpiryDate",
                table: "VenueUpdateRequests");

            migrationBuilder.DropColumn(
                name: "NewLandUseIssueDate",
                table: "VenueUpdateRequests");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "NewLandUseExpiryDate",
                table: "VenueUpdateRequests",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NewLandUseIssueDate",
                table: "VenueUpdateRequests",
                type: "datetime(6)",
                nullable: true);
        }
    }
}
