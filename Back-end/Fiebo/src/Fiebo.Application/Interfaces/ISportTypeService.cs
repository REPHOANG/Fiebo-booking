using Fiebo.Application.DTOs.SportType;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ISportTypeService
    {
        Task<int> CreateSportTypeAsync(CreateSportTypeRequest request, CancellationToken cancellationToken = default);
        Task<SportTypeResponse> GetSportTypeByIdAsync(int id, CancellationToken cancellationToken = default);
        Task UpdateSportTypeAsync(int id, UpdateSportTypeRequest request, CancellationToken cancellationToken = default);
    }
}