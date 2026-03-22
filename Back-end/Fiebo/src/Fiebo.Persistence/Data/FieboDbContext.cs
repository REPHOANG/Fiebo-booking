using Fiebo.Domain.Entities;
using Fiebo.Persistence.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Data
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
        public DbSet<BookingDetail> BookingDetails { get; set; }
        public DbSet<TimeSlot> TimeSlots { get; set; }
        public DbSet<ReviewImage> ReviewImages { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<TopUpRequest> TopUpRequests { get; set; }
        public DbSet<WalletTransaction> WalletTransactions { get; set; }
        public DbSet<TicketEvent> TicketEvents { get; set; }
        public DbSet<TicketParticipant> TicketParticipants { get; set; }
        public DbSet<TicketEventDetail> TicketEventDetails { get; set; }
        public DbSet<VenueStaff> VenueStaff {  get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Wallet
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

                entity.HasOne<ApplicationUser>()
                      .WithMany()
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.BookingId)
                        .IsUnique();

                    entity.HasMany(r => r.Images)
                          .WithOne(i => i.Review)
                          .HasForeignKey(i => i.ReviewId);
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

                entity.Property(b => b.CancelReason)
                      .HasMaxLength(255);

                entity.HasOne(e => e.Venue)
                      .WithMany(v => v.Bookings)
                      .HasForeignKey(e => e.VenueId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Review)
                      .WithOne(r => r.Booking)
                      .HasForeignKey<Review>(r => r.BookingId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.Property(b => b.TotalPrice)
                      .HasPrecision(18, 2);
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
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();

                entity.Property(x => x.StartTime)
                      .IsRequired();

                entity.Property(x => x.EndTime)
                      .IsRequired();

                entity.Property(x => x.Price)
                      .HasPrecision(12, 2)
                      .IsRequired();

                entity.Property(x => x.VenueId)
                      .IsRequired();

                entity.Property(x => x.SportTypeId)
                      .IsRequired();

                entity.HasOne(x => x.Venue)
                      .WithMany(v => v.TimeSlots)
                      .HasForeignKey(x => x.VenueId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.SportType)
                      .WithMany(s => s.TimeSlots)
                      .HasForeignKey(x => x.SportTypeId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.VenueId,
                    x.SportTypeId,
                    x.DayOfWeek,
                    x.StartTime
                })
                .IsUnique();
            });
            // ReviewImage
            modelBuilder.Entity<ReviewImage>(entity =>
            {
                entity.HasKey(e => e.ImageId);

                entity.Property(e => e.ImageId)
                      .ValueGeneratedOnAdd();

                entity.Property(e => e.ImageUrl)
                      .IsRequired()
                      .HasMaxLength(255);

                entity.Property(e => e.ReviewId)
                      .IsRequired();

                entity.HasOne(e => e.Review)
                      .WithMany(r => r.Images)
                      .HasForeignKey(e => e.ReviewId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id).ValueGeneratedOnAdd();

                entity.Property(r => r.Title)
                      .HasMaxLength(200)
                      .IsRequired();

                entity.Property(r => r.Content)
                      .HasColumnType("text")
                      .IsRequired();

                entity.Property(r => r.Status)
                      .HasDefaultValue(0); // 0: Pending

                entity.Property(r => r.UserId)
                      .IsRequired();

                entity.HasOne(r => r.Booking)
                      .WithMany()
                      .HasForeignKey(r => r.BookingId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.Property(r => r.ResponseContent)
                      .HasColumnType("text")
                      .IsRequired(false);
                entity.Property(r => r.AdminId)
                      .HasMaxLength(450)
                      .IsRequired(false);
                entity.HasOne<ApplicationUser>()
                      .WithMany()
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

            });
            // TopUpRequest
            modelBuilder.Entity<TopUpRequest>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id)
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.Amount)
                    .IsRequired()
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.Status)
                    .IsRequired();

                entity.Property(x => x.PaidAt);

                entity.HasOne(x => x.Wallet)
                .WithMany(w => w.TopUpRequests)
                .HasForeignKey(x => x.WalletId)
                .OnDelete(DeleteBehavior.Restrict);
            });
            // WalletTransaction
            modelBuilder.Entity<WalletTransaction>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id)
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.Amount)
                    .IsRequired()
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.Direction)
                    .IsRequired();

                entity.Property(x => x.TransactionType)
                    .IsRequired();

                entity.Property(x => x.ReferenceId);

                entity.HasIndex(x => x.WalletId);

                entity.HasOne(x => x.Wallet)
                    .WithMany(w => w.Transactions)
                    .HasForeignKey(x => x.WalletId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TicketEvent
            modelBuilder.Entity<TicketEvent>(entity =>
            {
                entity.ToTable("TicketEvent");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id)
                    .ValueGeneratedOnAdd();

                entity.Property(e => e.Description)
                    .HasMaxLength(255);

                entity.Property(e => e.EventDate)
                    .IsRequired();

                entity.Property(e => e.MaxPlayer)
                    .IsRequired();

                entity.Property(e => e.MinPlayer)
                    .IsRequired();

                entity.Property(e => e.PricePerPerson)
                    .HasColumnType("decimal(12,2)")
                    .IsRequired();

                entity.Property(e => e.Status)
                    .HasConversion<int>();

                // Relationships
                entity.HasMany(e => e.Details)
                .WithOne(d => d.Event)        
                .HasForeignKey(d => d.EventId)        
                .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Participants)
                    .WithOne(p => p.Event)
                    .HasForeignKey(p => p.EventId);
            });

            // TicketParticipant
            modelBuilder.Entity<TicketParticipant>(entity =>
            {
                entity.ToTable("TicketParticipant");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id)
                    .ValueGeneratedOnAdd();

                entity.Property(e => e.TicketQuantity)
                    .IsRequired();

                entity.Property(tp => tp.PricePerTicket)
                      .HasPrecision(12, 2)
                      .IsRequired();

                entity.Property(tp => tp.TotalPrice)
                    .HasPrecision(12, 2)
                    .IsRequired();

                entity.HasOne(e => e.Event)
                    .WithMany(e => e.Participants)
                    .HasForeignKey(e => e.EventId);
            });

            // TicketEventDetail
            modelBuilder.Entity<TicketEventDetail>(entity =>
            {
                entity.ToTable("TicketEventDetail");

                entity.HasKey(d => d.Id);

                entity.HasOne(d => d.Event)
                    .WithMany(e => e.Details)
                    .HasForeignKey(d => d.EventId);

                entity.HasOne(d => d.Field)
                    .WithMany()
                    .HasForeignKey(d => d.FieldId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Slot)
                    .WithMany()
                    .HasForeignKey(d => d.SlotId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(d => new { d.EventId, d.FieldId, d.SlotId })
                    .IsUnique();
            });

            // VenueStaff
            modelBuilder.Entity<VenueStaff>(entity =>
            {
                entity.HasKey(vs => vs.Id);

                entity.HasOne(vs => vs.Venue)
                      .WithMany(v => v.VenueStaffs)
                      .HasForeignKey(vs => vs.VenueId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
