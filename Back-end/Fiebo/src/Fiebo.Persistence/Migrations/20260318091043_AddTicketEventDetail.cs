using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketEventDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketEvent_Fields_FieldId",
                table: "TicketEvent");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketEvent_TimeSlots_SlotId",
                table: "TicketEvent");

            migrationBuilder.DropIndex(
                name: "IX_TicketEvent_FieldId",
                table: "TicketEvent");

            migrationBuilder.DropIndex(
                name: "IX_TicketEvent_SlotId",
                table: "TicketEvent");

            migrationBuilder.RenameColumn(
                name: "ParticipantId",
                table: "TicketParticipant",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "EventId",
                table: "TicketEvent",
                newName: "Id");

            migrationBuilder.CreateTable(
                name: "TicketEventDetail",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    EventId = table.Column<int>(type: "int", nullable: false),
                    FieldId = table.Column<int>(type: "int", nullable: false),
                    SlotId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketEventDetail", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TicketEventDetail_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketEventDetail_TicketEvent_EventId",
                        column: x => x.EventId,
                        principalTable: "TicketEvent",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TicketEventDetail_TimeSlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "TimeSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEventDetail_EventId_FieldId_SlotId",
                table: "TicketEventDetail",
                columns: new[] { "EventId", "FieldId", "SlotId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketEventDetail_FieldId",
                table: "TicketEventDetail",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEventDetail_SlotId",
                table: "TicketEventDetail",
                column: "SlotId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TicketEventDetail");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "TicketParticipant",
                newName: "ParticipantId");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "TicketEvent",
                newName: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEvent_FieldId",
                table: "TicketEvent",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEvent_SlotId",
                table: "TicketEvent",
                column: "SlotId");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketEvent_Fields_FieldId",
                table: "TicketEvent",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TicketEvent_TimeSlots_SlotId",
                table: "TicketEvent",
                column: "SlotId",
                principalTable: "TimeSlots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
