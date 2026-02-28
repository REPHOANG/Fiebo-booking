using Fiebo.Domain.DTO.Field;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IVenueService
    {
        Task<List<NearbyFieldResponse>> GetNearbyVenues(double userLat, double userLng, int? sportTypeId, int limit = 5);
    }
}
