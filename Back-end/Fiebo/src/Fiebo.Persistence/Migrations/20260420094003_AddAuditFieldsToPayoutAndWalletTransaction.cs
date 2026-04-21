using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditFieldsToPayoutAndWalletTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "WalletTransactions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcessedBy",
                table: "WalletTransactions",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "WalletTransactions",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "Payouts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcessedBy",
                table: "Payouts",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "Payouts");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "Payouts");
        }
    }
}
