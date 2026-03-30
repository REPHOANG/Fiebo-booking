using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Venue
{
    public class OwnerVenueDetailResponse
    {
        public int Id { get; set; }

        public string? Name { get; set; }

        public TimeOnly OpenTime { get; set; }

        public TimeOnly CloseTime { get; set; }

        public string? Description { get; set; }

        public string? AddressDetail { get; set; }

        public string? ThumbnailUrl { get; set; }

        public int ProvinceId { get; set; }

        public string? ProvinceName { get; set; }

        public int WardId { get; set; }

        public string? WardName { get; set; }

        public double Longitude { get; set; }

        public double Latitude { get; set; }
        public VenueDocumentResponse? LandDocument { get; set; }
        public VenueDocumentResponse? BusinessLicense { get; set; }

        public string? Status { get; set; }
    }
}
