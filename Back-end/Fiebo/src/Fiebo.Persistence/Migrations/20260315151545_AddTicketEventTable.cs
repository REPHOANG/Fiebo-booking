using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketEventTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "Bookings");

            migrationBuilder.AddColumn<int>(
                name: "BookingType",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Bookings",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");



            migrationBuilder.CreateTable(
                name: "TicketEvent",
                columns: table => new
                {
                    EventId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FieldId = table.Column<int>(type: "int", nullable: false),
                    SlotId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EventDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MinPlayer = table.Column<int>(type: "int", nullable: false),
                    MaxPlayer = table.Column<int>(type: "int", nullable: false),
                    PricePerPerson = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    OwnerId = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketEvent", x => x.EventId);
                    table.ForeignKey(
                        name: "FK_TicketEvent_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketEvent_TimeSlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "TimeSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TicketParticipant",
                columns: table => new
                {
                    ParticipantId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    EventId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TicketAmount = table.Column<int>(type: "int", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketParticipant", x => x.ParticipantId);
                    table.ForeignKey(
                        name: "FK_TicketParticipant_TicketEvent_EventId",
                        column: x => x.EventId,
                        principalTable: "TicketEvent",
                        principalColumn: "EventId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEvent_FieldId",
                table: "TicketEvent",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEvent_SlotId",
                table: "TicketEvent",
                column: "SlotId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketParticipant_EventId",
                table: "TicketParticipant",
                column: "EventId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            

            migrationBuilder.DropTable(
                name: "TicketParticipant");

            migrationBuilder.DropTable(
                name: "TicketEvent");

            migrationBuilder.DropColumn(
                name: "BookingType",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "Bookings");

            migrationBuilder.AddColumn<string>(
                name: "StaffId",
                table: "Bookings",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
