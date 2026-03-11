using Fiebo.Application.DTOs.Review;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IReviewService
    {
        Task<bool> CreateReviewAsync(CreateReviewRequest request, string userId);
    }
}
