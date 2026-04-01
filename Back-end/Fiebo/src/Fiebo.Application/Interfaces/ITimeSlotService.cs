using Fiebo.Application.DTOs.Venue;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ITimeSlotService
    {
        Task<List<VenueTimeSlotResponse>> GetVenueTimeSlotAsync(int venueId, int sportTypeId, string? userId);
        Task<VenueTimeSlotResponse> CreateVenueTimeSlotAsync(int venueId, CreateVenueTimeSlotRequest request, string? ownerId);
        Task<VenueTimeSlotResponse> UpdateVenueTimeSlotAsync(int timeSlotId, UpdateVenueTimeSlotRequest request, string? ownerId);
    }
}
