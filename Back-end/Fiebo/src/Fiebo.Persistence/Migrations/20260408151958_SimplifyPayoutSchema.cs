using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyPayoutSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payouts_UserBankAccounts_BankAccountId",
                table: "Payouts");

            migrationBuilder.DropIndex(
                name: "IX_Payouts_BankAccountId",
                table: "Payouts");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "Payouts");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "Payouts");

            migrationBuilder.DropColumn(
                name: "BatchCode",
                table: "PayoutBatches");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "Payouts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "Payouts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BatchCode",
                table: "PayoutBatches",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Payouts_BankAccountId",
                table: "Payouts",
                column: "BankAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payouts_UserBankAccounts_BankAccountId",
                table: "Payouts",
                column: "BankAccountId",
                principalTable: "UserBankAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
