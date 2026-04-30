using Fiebo.Application.DTOs.Venue;
using System;
using System.Collections.Generic;

namespace Fiebo.Application.DTOs.Admin
{
    public class PendingVenueDetailResponse
    {
        // Venue Info
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }

        // Owner Info
        public string OwnerName { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; }
        public double Longitude { get; set; }
        public double Latitude { get; set; }

        // Owner Bank Info
        public string OwnerBankName { get; set; } = string.Empty;
        public string OwnerBankAccountNumber { get; set; } = string.Empty;
        public string OwnerAccountHolderName { get; set; } = string.Empty;

        // Documents
        public VenueDocumentResponse? BusinessLicense { get; set; } = new();
    }
}
