using Fiebo.Application.DTOs.Venue;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Admin
{
    public class VenueDetailResponse
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }
        public string VenueStatus { get; set; } = string.Empty;

        // Owner Info
        public string OwnerName { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;

        // Owner Bank Info
        public string OwnerBankName { get; set; } = string.Empty;
        public string OwnerBankAccountNumber { get; set; } = string.Empty;
        public string OwnerAccountHolderName { get; set; } = string.Empty;

        // Documents
        public VenueDocumentResponse? BusinessLicense { get; set; } = new();
        public VenueDocumentResponse? LandUseDocument { get; set; } = new();
    }
}
