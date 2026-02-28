using Fiebo.Domain.Entities;
using Fiebo.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Data
{
    public class FieboDbContext : IdentityDbContext<ApplicationUser>
    {
        public FieboDbContext(DbContextOptions<FieboDbContext> options) : base(options)
        {
        }

        // Khai báo các bảng (DbSet)
        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<Field> Fields { get; set; }
        public DbSet<FieldImage> FieldImages { get; set; }
        public DbSet<Venue> Venues { get; set; }
        public DbSet<SportType> SportTypes { get; set; }
        public DbSet<Province> Provinces { get; set; }
        public DbSet<Ward> Wards { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Wallet>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Balance)
                      .HasPrecision(18, 2)
                      .HasDefaultValue(0)
                      .IsRequired();

                entity.Property(x => x.CreatedDate)
                      .IsRequired();

                entity.Property(x => x.UserId)
                      .HasMaxLength(450)
                      .IsRequired();

                entity.HasOne<ApplicationUser>()
                      .WithOne()
                      .HasForeignKey<Wallet>(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(x => x.UserId)
                      .IsUnique();
            });

            modelBuilder.Entity<ApplicationUser>()
                .Property(u => u.DateOfBirth)
                .IsRequired(false);

            // Field
            modelBuilder.Entity<Field>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                      .HasMaxLength(100)
                      .IsRequired();

                entity.HasOne(x => x.SportType)
                      .WithMany(x => x.Fields)
                      .HasForeignKey(x => x.SportTypeId);

                entity.HasOne(x => x.Venue)
                      .WithMany(x => x.Fields)
                      .HasForeignKey(x => x.VenueId);
            });

            // FieldImage
            modelBuilder.Entity<FieldImage>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.ImageUrl)
                      .HasMaxLength(255);

                entity.HasOne(x => x.Field)
                      .WithMany(x => x.Images)
                      .HasForeignKey(x => x.FieldId);
            });

            // Venue
            modelBuilder.Entity<Venue>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.AddressDetail)
                      .HasMaxLength(255)
                      .IsRequired();

                entity.Property(x => x.Longitude)
                      .HasPrecision(9, 6);

                entity.Property(x => x.Latitude)
                      .HasPrecision(9, 6);

                entity.HasOne(x => x.Province)
                      .WithMany(x => x.Venues)
                      .HasForeignKey(x => x.ProvinceId);

                entity.HasOne(x => x.Ward)
                      .WithMany(x => x.Venues)
                      .HasForeignKey(x => x.WardId);
            });
            
            // SportType
            modelBuilder.Entity<SportType>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                      .HasMaxLength(50)
                      .IsRequired();
            });

            // Province
            modelBuilder.Entity<Province>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                      .HasMaxLength(50)
                      .IsRequired();
            });
            // Ward
            modelBuilder.Entity<Ward>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                      .HasMaxLength(50)
                      .IsRequired();

                entity.HasOne(x => x.Province)
                      .WithMany(x => x.Wards)
                      .HasForeignKey(x => x.ProvinceId);
            });
        }
    }
}
