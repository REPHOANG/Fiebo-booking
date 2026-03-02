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
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<BookingDetail> BookingsDetail { get; set; }
        public DbSet<TimeSlot> TimeSlots { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Wallet>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

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
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

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
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

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
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(x => x.AddressDetail)
                      .HasMaxLength(255)
                      .IsRequired();

                entity.Property(x => x.Latitude)
                      .HasColumnType("double");

                entity.Property(x => x.Longitude)
                      .HasColumnType("double");

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
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

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

            // Review
            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(b => b.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(r => r.Comment)
                      .HasColumnType("text");

                entity.Property(r => r.Rating)
                      .IsRequired();

                entity.Property(r => r.UserId)
                      .IsRequired();

                entity.Property(r => r.BookingDetailId)
                      .IsRequired();

                entity.HasOne<ApplicationUser>()
                      .WithMany()
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(r => r.BookingDetail)
                      .WithMany(v => v.Reviews)
                      .HasForeignKey(r => r.BookingDetailId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Booking
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(b => b.Id);
                entity.Property(b => b.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(b => b.UserId)
                      .IsRequired()
                      .HasMaxLength(50);

                entity.Property(b => b.StaffId)
                      .HasMaxLength(50);

                entity.Property(b => b.TotalPrice)
                      .HasPrecision(18, 2);

                entity.Property(b => b.BookingDate)
                      .IsRequired();
            });

            // BookingDetail
            modelBuilder.Entity<BookingDetail>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(e => e.BookingId)
                      .IsRequired();

                entity.Property(e => e.FieldId)
                      .IsRequired();

                entity.Property(e => e.SlotId)
                      .IsRequired();

                entity.Property(e => e.Price)
                      .HasColumnType("decimal(12,2)")
                      .IsRequired();

                entity.HasOne(e => e.Booking)
                      .WithMany(b => b.BookingDetails)
                      .HasForeignKey(e => e.BookingId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Field)
                      .WithMany(f => f.BookingDetails)
                      .HasForeignKey(e => e.FieldId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.TimeSlot)
                      .WithMany(ts => ts.BookingDetails)
                      .HasForeignKey(e => e.SlotId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // TimeSlot
            modelBuilder.Entity<TimeSlot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(e => e.StartTime)
                      .IsRequired()
                      .HasColumnType("time");

                entity.Property(e => e.EndTime)
                      .IsRequired()
                      .HasColumnType("time");

                entity.Property(e => e.DayOfWeek)
                      .IsRequired()
                      .HasConversion<int>();

                entity.Property(e => e.FieldId)
                      .IsRequired();

                entity.Property(e => e.Price)
                      .HasColumnType("decimal(12,2)")
                      .IsRequired();

                entity.HasOne(e => e.Field)
                      .WithMany(f => f.TimeSlots)
                      .HasForeignKey(e => e.FieldId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Index
                entity.HasIndex(e => new { e.FieldId, e.DayOfWeek });
            });
        }
    }
}
