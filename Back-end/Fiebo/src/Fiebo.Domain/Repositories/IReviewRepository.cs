using Fiebo.Domain.Entities;
using Fiebo.Domain.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IReviewRepository : IRepository<Review>
    {
        Task<PagedResult<Review>> GetByVenueAsync(
        int venueId,
        int page,
        int pageSize,
        string? sort);
        Task<double> GetAverageByVenueAsync(int venueId);
        Task<Dictionary<int, double>> GetAveragesByVenueAsync(List<int> venueId);
        Task<int> CountByVenueAsync(int venueId);
    }
}
