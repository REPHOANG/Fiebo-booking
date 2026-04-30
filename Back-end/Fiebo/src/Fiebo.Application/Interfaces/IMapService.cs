using Fiebo.Application.DTOs.Field;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IMapService
    {
        Task<Dictionary<int, double>> GetDistancesAsync(
            double userLat,
            double userLng,
            List<VenueLocationDto> fields);
    }
}
