using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingConfirmFlowAndVenueUpdateRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmExpiredAt",
                table: "Bookings",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "VenueUpdateRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    VenueId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NewAddressDetail = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NewProvinceId = table.Column<int>(type: "int", nullable: true),
                    NewWardId = table.Column<int>(type: "int", nullable: true),
                    NewLatitude = table.Column<double>(type: "double", nullable: true),
                    NewLongitude = table.Column<double>(type: "double", nullable: true),
                    NewBusinessLicenseIssueDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    NewBusinessLicenseExpiryDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    NewLandUseIssueDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    NewLandUseExpiryDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AdminNote = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReviewedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ReviewedByAdminId = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VenueUpdateRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VenueUpdateRequests_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_VenueUpdateRequests_VenueId",
                table: "VenueUpdateRequests",
                column: "VenueId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VenueUpdateRequests");

            migrationBuilder.DropColumn(
                name: "ConfirmExpiredAt",
                table: "Bookings");
        }
    }
}
