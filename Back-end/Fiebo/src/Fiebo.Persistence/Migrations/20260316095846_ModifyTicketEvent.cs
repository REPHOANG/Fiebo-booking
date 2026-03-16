using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ModifyTicketEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TicketAmount",
                table: "TicketParticipant",
                newName: "TicketQuantity");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "TicketParticipant",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Fullname",
                table: "TicketParticipant",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "TicketParticipant",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Fullname",
                table: "TicketParticipant");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "TicketParticipant");

            migrationBuilder.RenameColumn(
                name: "TicketQuantity",
                table: "TicketParticipant",
                newName: "TicketAmount");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "TicketParticipant",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
