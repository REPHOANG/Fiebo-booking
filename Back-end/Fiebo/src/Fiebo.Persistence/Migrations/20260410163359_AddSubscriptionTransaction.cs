using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fiebo.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OwnerPlans_AspNetUsers_OwnerId",
                table: "OwnerPlans");

            migrationBuilder.DropIndex(
                name: "IX_OwnerPlans_OwnerId",
                table: "OwnerPlans");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "OwnerPlans");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "OwnerPlans");

            migrationBuilder.CreateTable(
                name: "SubscriptionTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    OwnerPlanId = table.Column<int>(type: "int", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionTransactions_OwnerPlans_OwnerPlanId",
                        column: x => x.OwnerPlanId,
                        principalTable: "OwnerPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubscriptionTransactions_SubscriptionPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_OwnerPlans_OwnerId",
                table: "OwnerPlans",
                column: "OwnerId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OwnerPlans_AspNetUsers_OwnerId",
                table: "OwnerPlans",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionTransactions_OwnerPlanId",
                table: "SubscriptionTransactions",
                column: "OwnerPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionTransactions_PlanId",
                table: "SubscriptionTransactions",
                column: "PlanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubscriptionTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_OwnerPlans_AspNetUsers_OwnerId",
                table: "OwnerPlans");

            migrationBuilder.DropIndex(
                name: "IX_OwnerPlans_OwnerId",
                table: "OwnerPlans");

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAt",
                table: "OwnerPlans",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "OwnerPlans",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_OwnerPlans_OwnerId",
                table: "OwnerPlans",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_OwnerPlans_AspNetUsers_OwnerId",
                table: "OwnerPlans",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
