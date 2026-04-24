using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class VenueUpdateRequest : BaseEntity
    {
        public int VenueId { get; set; }

        public string Status { get; set; } = "Pending"; // Pending / Approved / Rejected

        // ---- Thay đổi địa chỉ (nullable nếu không thay đổi) ----
        public string? NewAddressDetail { get; set; }
        public int? NewProvinceId { get; set; }
        public int? NewWardId { get; set; }
        public double? NewLatitude { get; set; }
        public double? NewLongitude { get; set; }

        // ---- Thay đổi giấy phép kinh doanh ----
        public DateTime? NewBusinessLicenseIssueDate { get; set; }
        public DateTime? NewBusinessLicenseExpiryDate { get; set; }


        // ---- Ghi chú từ Admin (khi reject) ----
        public string? AdminNote { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedByAdminId { get; set; }

        // Navigation
        public Venue Venue { get; set; } = null!;
    }
}
