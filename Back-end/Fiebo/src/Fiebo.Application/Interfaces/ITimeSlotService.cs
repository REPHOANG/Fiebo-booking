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
        Task<VenueTimeSlotResponse> GetVenueTimeSlotAsync(int venueId, int sportTypeId, string? userId);
        Task<VenueTimeSlotDto> CreateVenueTimeSlotAsync(int venueId, CreateVenueTimeSlotRequest request, string? ownerId);
        Task<VenueTimeSlotDto> UpdateVenueTimeSlotAsync(int timeSlotId, UpdateVenueTimeSlotRequest request, string? ownerId);
        Task DeleteVenueTimeSlotAsync(int timeSlotId, string? ownerId);
    }
}
