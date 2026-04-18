using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Admin
{
    public class OwnerDetailResponse
    {
        // Basic info
        public string Name { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;

        // Account info
        public string Status { get; set; } = default!;
        public DateTime? CreatedAt { get; set; }

        // Subscription
        public SubscriptionInfoDto? Subscription { get; set; }

        // Venues
        public List<VenueInfoDto> Venues { get; set; } = new();
    }

    public class SubscriptionInfoDto
    {
        public int Id { get; set; }
        public string CurrentPlan { get; set; } = default!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string SubscriptionStatus { get; set; } = default!;
    }

    public class VenueInfoDto
    {
        public int Id { get; set; }
        public string VenueName { get; set; } = default!;
        public string Province { get; set; } = default!;
        public string Ward { get; set; } = default!;
        public string AddressDetail { get; set; } = default!;

        public string Status { get; set; } = default!;
        public int NumberOfFields { get; set; }
    }
}
